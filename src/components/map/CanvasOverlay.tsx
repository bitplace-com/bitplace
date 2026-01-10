import { useEffect, useRef, useCallback } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';
import {
  type PixelStore,
  parsePixelKey,
  pixelKey,
} from './hooks/usePixelStore';
import { type SelectionState } from './hooks/useSelection';
import { lngLatToGridFloat, lngLatToGridInt, getCellSize, roundToDevicePixel } from '@/lib/pixelGrid';
import type { InvalidPixel, GameMode } from '@/hooks/useGameActions';
import { isMaterial, getMaterialPattern } from '@/lib/materials/materialRegistry';
import { markDrawStart, markDrawEnd } from '@/lib/perfMetrics';

interface CanvasOverlayProps {
  map: MapLibreMap | null;
  pixels: PixelStore;
  selection: SelectionState;
  hoverPixel: { x: number; y: number } | null;
  canPaint: boolean;
  invalidPixels?: InvalidPixel[];
  artOpacity?: number;
  mode?: GameMode;
  brushSelectionPixels?: Set<string>;
  previewHiddenPixels?: Set<string>;
  draftPixels?: Map<string, { color: string }>;
  inspectBrushSelectionPixels?: Set<string>;
  isInspectSelecting?: boolean;
}

// Mode-specific hover and selection colors
const getModeColors = (mode: GameMode = 'PAINT') => {
  switch (mode) {
    case 'DEFEND': return { hover: 'rgba(74, 222, 128, 0.4)', border: 'rgba(74, 222, 128, 0.8)', fill: 'rgba(74, 222, 128, 0.15)' };
    case 'ATTACK': return { hover: 'rgba(248, 113, 113, 0.4)', border: 'rgba(248, 113, 113, 0.8)', fill: 'rgba(248, 113, 113, 0.15)' };
    case 'REINFORCE': return { hover: 'rgba(96, 165, 250, 0.4)', border: 'rgba(96, 165, 250, 0.8)', fill: 'rgba(96, 165, 250, 0.15)' };
    default: return { hover: 'rgba(255, 255, 255, 0.3)', border: 'rgba(0, 200, 255, 0.8)', fill: 'rgba(0, 200, 255, 0.15)' };
  }
};

export function CanvasOverlay({
  map,
  pixels,
  selection,
  hoverPixel,
  canPaint,
  invalidPixels = [],
  artOpacity = 1,
  mode = 'PAINT',
  brushSelectionPixels,
  previewHiddenPixels,
  draftPixels,
  inspectBrushSelectionPixels,
  isInspectSelecting = false,
}: CanvasOverlayProps) {
  const modeColors = getModeColors(mode);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawRequestRef = useRef<number | null>(null);
  const lastDrawnPixelCountRef = useRef(0);

  const draw = useCallback(() => {
    const drawStart = markDrawStart();
    const canvas = canvasRef.current;
    if (!canvas || !map) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Set up high-DPI canvas
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    
    // Use setTransform for DPR scaling
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    
    // Disable image smoothing for pixel-crisp rendering
    ctx.imageSmoothingEnabled = false;

    ctx.clearRect(0, 0, width, height);

    const zoom = map.getZoom();
    const cellSize = getCellSize(zoom);
    
    // Get viewport top-left in grid coordinates (float for precise alignment)
    const tlLngLat = map.unproject([0, 0]);
    const tlGrid = lngLatToGridFloat(tlLngLat.lng, tlLngLat.lat);
    
    // Apply art opacity
    ctx.globalAlpha = artOpacity;
    const invalidSet = new Set(invalidPixels.map(p => `${p.x}:${p.y}`));

    // Only render pixels that are visible (optimization)
    if (cellSize > 0.5) {
      // Get visible bounds in grid coordinates
      const brLngLat = map.unproject([width, height]);
      const brGrid = lngLatToGridInt(brLngLat.lng, brLngLat.lat);
      const topLeft = lngLatToGridInt(tlLngLat.lng, tlLngLat.lat);

      // OPTIMIZATION: Batch pixels by color/material to minimize fillStyle changes
      const colorBatches = new Map<string, { x: number; y: number }[]>();
      const materialBatches = new Map<string, { x: number; y: number }[]>();
      
      pixels.forEach((data, key) => {
        // Skip preview hidden pixels (erase preview)
        if (previewHiddenPixels?.has(key)) return;
        
        const { x, y } = parsePixelKey(key);
        
        // Quick bounds check with margin
        if (x < topLeft.x - 1 || x > brGrid.x + 1) return;
        if (y < topLeft.y - 1 || y > brGrid.y + 1) return;

        // Separate materials from solid colors
        if (isMaterial(data.color)) {
          if (!materialBatches.has(data.color)) {
            materialBatches.set(data.color, []);
          }
          materialBatches.get(data.color)!.push({ x, y });
        } else {
          if (!colorBatches.has(data.color)) {
            colorBatches.set(data.color, []);
          }
          colorBatches.get(data.color)!.push({ x, y });
        }
      });

      // Draw all pixels of same color in one batch (fewer fillStyle changes)
      colorBatches.forEach((positions, color) => {
        ctx.fillStyle = color;
        positions.forEach(({ x, y }) => {
          // Calculate screen position using grid math
          const screenX = (x - tlGrid.x) * cellSize;
          const screenY = (y - tlGrid.y) * cellSize;
          
          // Round to device pixels for crisp rendering
          const rx = roundToDevicePixel(screenX, dpr);
          const ry = roundToDevicePixel(screenY, dpr);
          const rSize = Math.max(1, roundToDevicePixel(cellSize, dpr));
          
          ctx.fillRect(rx, ry, rSize, rSize);
        });
      });

      // Draw material pixels with cached patterns
      materialBatches.forEach((positions, materialId) => {
        const pattern = getMaterialPattern(materialId);
        if (pattern) {
          ctx.fillStyle = pattern;
        } else {
          // Fallback color for unknown materials
          ctx.fillStyle = '#FF00FF';
        }
        positions.forEach(({ x, y }) => {
          const screenX = (x - tlGrid.x) * cellSize;
          const screenY = (y - tlGrid.y) * cellSize;
          
          const rx = roundToDevicePixel(screenX, dpr);
          const ry = roundToDevicePixel(screenY, dpr);
          const rSize = Math.max(1, roundToDevicePixel(cellSize, dpr));
          
          ctx.fillRect(rx, ry, rSize, rSize);
        });
      });

      // Reset opacity for overlays
      ctx.globalAlpha = 1;

      // Draw invalid pixel highlights
      if (invalidPixels.length > 0 && cellSize > 1) {
        // Batch invalid overlays
        ctx.fillStyle = 'rgba(255, 50, 50, 0.4)';
        invalidPixels.forEach(({ x, y }) => {
          if (x < topLeft.x - 1 || x > brGrid.x + 1) return;
          if (y < topLeft.y - 1 || y > brGrid.y + 1) return;
          
          const screenX = (x - tlGrid.x) * cellSize;
          const screenY = (y - tlGrid.y) * cellSize;
          const rx = roundToDevicePixel(screenX, dpr);
          const ry = roundToDevicePixel(screenY, dpr);
          const rSize = Math.max(1, roundToDevicePixel(cellSize, dpr));
          
          ctx.fillRect(rx, ry, rSize, rSize);
        });
        
        // Batch invalid borders
        ctx.strokeStyle = 'rgba(255, 50, 50, 0.9)';
        ctx.lineWidth = 2;
        invalidPixels.forEach(({ x, y }) => {
          if (x < topLeft.x - 1 || x > brGrid.x + 1) return;
          if (y < topLeft.y - 1 || y > brGrid.y + 1) return;
          
          const screenX = (x - tlGrid.x) * cellSize;
          const screenY = (y - tlGrid.y) * cellSize;
          const rx = roundToDevicePixel(screenX, dpr);
          const ry = roundToDevicePixel(screenY, dpr);
          const rSize = Math.max(1, roundToDevicePixel(cellSize, dpr));
          
          ctx.strokeRect(rx, ry, rSize, rSize);
        });
      }

      // Draw draft pixels (preview layer with slight transparency)
      if (draftPixels && draftPixels.size > 0 && cellSize > 0.5) {
        // Batch draft pixels by color/material
        const draftColorBatches = new Map<string, { x: number; y: number }[]>();
        const draftMaterialBatches = new Map<string, { x: number; y: number }[]>();
        draftPixels.forEach((data, key) => {
          const [x, y] = key.split(':').map(Number);
          if (x < topLeft.x - 1 || x > brGrid.x + 1) return;
          if (y < topLeft.y - 1 || y > brGrid.y + 1) return;
          
          if (isMaterial(data.color)) {
            if (!draftMaterialBatches.has(data.color)) {
              draftMaterialBatches.set(data.color, []);
            }
            draftMaterialBatches.get(data.color)!.push({ x, y });
          } else {
            if (!draftColorBatches.has(data.color)) {
              draftColorBatches.set(data.color, []);
            }
            draftColorBatches.get(data.color)!.push({ x, y });
          }
        });
        
        // Draw with slight transparency to indicate draft
        ctx.globalAlpha = 0.85;
        
        // Draw solid color drafts
        draftColorBatches.forEach((positions, color) => {
          ctx.fillStyle = color;
          positions.forEach(({ x, y }) => {
            const screenX = (x - tlGrid.x) * cellSize;
            const screenY = (y - tlGrid.y) * cellSize;
            const rx = roundToDevicePixel(screenX, dpr);
            const ry = roundToDevicePixel(screenY, dpr);
            const rSize = Math.max(1, roundToDevicePixel(cellSize, dpr));
            ctx.fillRect(rx, ry, rSize, rSize);
          });
        });
        
        // Draw material drafts
        draftMaterialBatches.forEach((positions, materialId) => {
          const pattern = getMaterialPattern(materialId);
          ctx.fillStyle = pattern || '#FF00FF';
          positions.forEach(({ x, y }) => {
            const screenX = (x - tlGrid.x) * cellSize;
            const screenY = (y - tlGrid.y) * cellSize;
            const rx = roundToDevicePixel(screenX, dpr);
            const ry = roundToDevicePixel(screenY, dpr);
            const rSize = Math.max(1, roundToDevicePixel(cellSize, dpr));
            ctx.fillRect(rx, ry, rSize, rSize);
          });
        });
        
        ctx.globalAlpha = 1;
        
        // Draw dashed border around draft pixels
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        draftPixels.forEach((data, key) => {
          const [x, y] = key.split(':').map(Number);
          if (x < topLeft.x - 1 || x > brGrid.x + 1) return;
          if (y < topLeft.y - 1 || y > brGrid.y + 1) return;
          
          const screenX = (x - tlGrid.x) * cellSize;
          const screenY = (y - tlGrid.y) * cellSize;
          const rx = roundToDevicePixel(screenX, dpr);
          const ry = roundToDevicePixel(screenY, dpr);
          const rSize = Math.max(1, roundToDevicePixel(cellSize, dpr));
          ctx.strokeRect(rx, ry, rSize, rSize);
        });
        ctx.setLineDash([]);
      }

      // Draw brush selection highlights (Set-based selection)
      if (brushSelectionPixels && brushSelectionPixels.size > 0 && cellSize > 1) {
        ctx.fillStyle = mode === 'ERASE' ? 'rgba(248, 113, 113, 0.3)' : modeColors.fill;
        ctx.strokeStyle = mode === 'ERASE' ? 'rgba(248, 113, 113, 0.8)' : modeColors.border;
        ctx.lineWidth = 1;
        
        brushSelectionPixels.forEach(key => {
          const [x, y] = key.split(':').map(Number);
          if (x < topLeft.x - 1 || x > brGrid.x + 1) return;
          if (y < topLeft.y - 1 || y > brGrid.y + 1) return;
          
          const screenX = (x - tlGrid.x) * cellSize;
          const screenY = (y - tlGrid.y) * cellSize;
          const rx = roundToDevicePixel(screenX, dpr);
          const ry = roundToDevicePixel(screenY, dpr);
          const rSize = Math.max(1, roundToDevicePixel(cellSize, dpr));
          
          ctx.fillRect(rx, ry, rSize, rSize);
          ctx.strokeRect(rx, ry, rSize, rSize);
        });
      }

      // Draw HAND mode SPACE multi-select (inspect brush selection) with bounding box
      if (inspectBrushSelectionPixels && inspectBrushSelectionPixels.size > 0 && cellSize > 1) {
        // Calculate bounding box of all selected pixels
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        inspectBrushSelectionPixels.forEach(key => {
          const [x, y] = key.split(':').map(Number);
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        });
        
        // Draw individual pixel highlights
        const inspectFill = 'rgba(168, 85, 247, 0.25)'; // Purple tint for inspect
        const inspectBorder = 'rgba(168, 85, 247, 0.6)';
        ctx.fillStyle = inspectFill;
        ctx.strokeStyle = inspectBorder;
        ctx.lineWidth = 1;
        
        inspectBrushSelectionPixels.forEach(key => {
          const [x, y] = key.split(':').map(Number);
          if (x < topLeft.x - 1 || x > brGrid.x + 1) return;
          if (y < topLeft.y - 1 || y > brGrid.y + 1) return;
          
          const screenX = (x - tlGrid.x) * cellSize;
          const screenY = (y - tlGrid.y) * cellSize;
          const rx = roundToDevicePixel(screenX, dpr);
          const ry = roundToDevicePixel(screenY, dpr);
          const rSize = Math.max(1, roundToDevicePixel(cellSize, dpr));
          
          ctx.fillRect(rx, ry, rSize, rSize);
          ctx.strokeRect(rx, ry, rSize, rSize);
        });
        
        // Draw bounding box rectangle around selection
        const boxScreenX = (minX - tlGrid.x) * cellSize;
        const boxScreenY = (minY - tlGrid.y) * cellSize;
        const boxScreenEndX = (maxX + 1 - tlGrid.x) * cellSize;
        const boxScreenEndY = (maxY + 1 - tlGrid.y) * cellSize;
        
        const boxRx = roundToDevicePixel(boxScreenX, dpr);
        const boxRy = roundToDevicePixel(boxScreenY, dpr);
        const boxWidth = roundToDevicePixel(boxScreenEndX - boxScreenX, dpr);
        const boxHeight = roundToDevicePixel(boxScreenEndY - boxScreenY, dpr);
        
        // Dashed border for bounding box
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.9)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(boxRx, boxRy, boxWidth, boxHeight);
        ctx.setLineDash([]);
        
        // Pixel count badge (shown while selecting or when selection exists)
        const pixelCount = inspectBrushSelectionPixels.size;
        const badgeText = isInspectSelecting 
          ? `Selecting: ${pixelCount.toLocaleString()} px` 
          : `${pixelCount.toLocaleString()} px`;
        ctx.font = 'bold 12px system-ui, sans-serif';
        const textMetrics = ctx.measureText(badgeText);
        const badgePadding = 8;
        const badgeHeight = 24;
        const badgeWidth = textMetrics.width + badgePadding * 2;
        
        const badgeX = boxRx + boxWidth / 2 - badgeWidth / 2;
        const badgeY = boxRy - badgeHeight - 8;
        
        // Badge background
        ctx.fillStyle = 'rgba(88, 28, 135, 0.95)'; // Deep purple
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 6);
        ctx.fill();
        
        // Badge border
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.8)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Badge text
        ctx.fillStyle = '#E9D5FF'; // Light purple text
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeText, badgeX + badgeWidth / 2, badgeY + badgeHeight / 2);
      }
    }

    // Draw hover highlight at paint zoom with mode-specific colors
    if (hoverPixel && canPaint && cellSize > 1) {
      const screenX = (hoverPixel.x - tlGrid.x) * cellSize;
      const screenY = (hoverPixel.y - tlGrid.y) * cellSize;
      const rx = roundToDevicePixel(screenX, dpr);
      const ry = roundToDevicePixel(screenY, dpr);
      const rSize = Math.max(1, roundToDevicePixel(cellSize, dpr));
      
      const isInvalid = invalidSet.has(`${hoverPixel.x}:${hoverPixel.y}`);
      
      if (!isInvalid) {
        ctx.strokeStyle = mode === 'PAINT' ? 'rgba(255, 255, 255, 0.8)' : modeColors.border;
        ctx.lineWidth = 2;
        ctx.strokeRect(rx, ry, rSize, rSize);
        
        ctx.fillStyle = mode === 'PAINT' ? 'rgba(255, 255, 255, 0.1)' : modeColors.hover;
        ctx.fillRect(rx, ry, rSize, rSize);
      }
    }

    // Draw selection rectangle
    if (selection.bounds) {
      const { startX, startY, endX, endY } = selection.bounds;
      const minX = Math.min(startX, endX);
      const maxX = Math.max(startX, endX);
      const minY = Math.min(startY, endY);
      const maxY = Math.max(startY, endY);

      // Calculate screen positions for selection bounds
      const topLeftScreenX = (minX - tlGrid.x) * cellSize;
      const topLeftScreenY = (minY - tlGrid.y) * cellSize;
      const bottomRightScreenX = (maxX + 1 - tlGrid.x) * cellSize;
      const bottomRightScreenY = (maxY + 1 - tlGrid.y) * cellSize;

      const rectX = roundToDevicePixel(topLeftScreenX, dpr);
      const rectY = roundToDevicePixel(topLeftScreenY, dpr);
      const rectWidth = roundToDevicePixel(bottomRightScreenX - topLeftScreenX, dpr);
      const rectHeight = roundToDevicePixel(bottomRightScreenY - topLeftScreenY, dpr);

      // Selection fill - mode-specific colors, different if has invalid pixels
      const hasInvalid = invalidPixels.length > 0;
      ctx.fillStyle = hasInvalid 
        ? 'rgba(255, 100, 100, 0.15)' 
        : modeColors.fill;
      ctx.fillRect(rectX, rectY, rectWidth, rectHeight);

      // Selection border - mode-specific
      ctx.strokeStyle = hasInvalid 
        ? 'rgba(255, 100, 100, 0.8)' 
        : modeColors.border;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);
      ctx.setLineDash([]);

      // Selection count badge
      if (selection.pixelCount > 0) {
        const badgeText = `${selection.pixelCount.toLocaleString()} px`;
        ctx.font = '12px system-ui, sans-serif';
        const textMetrics = ctx.measureText(badgeText);
        const badgePadding = 6;
        const badgeHeight = 20;
        const badgeWidth = textMetrics.width + badgePadding * 2;
        
        const badgeX = rectX + rectWidth / 2 - badgeWidth / 2;
        const badgeY = rectY - badgeHeight - 8;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 4);
        ctx.fill();

        // Badge text color based on mode
        const badgeColor = hasInvalid ? '#FF6464' : (mode === 'DEFEND' ? '#4ade80' : mode === 'ATTACK' ? '#f87171' : mode === 'REINFORCE' ? '#60a5fa' : '#00C8FF');
        ctx.fillStyle = badgeColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeText, badgeX + badgeWidth / 2, badgeY + badgeHeight / 2);
      }
    }
    
    // Track pixel count and mark draw end for perf metrics
    lastDrawnPixelCountRef.current = pixels.size;
    markDrawEnd(drawStart, pixels.size);
  }, [map, pixels, selection, hoverPixel, canPaint, invalidPixels, artOpacity, mode, modeColors, brushSelectionPixels, previewHiddenPixels, draftPixels, inspectBrushSelectionPixels, isInspectSelecting]);

  useEffect(() => {
    if (!map) return;

    // Throttle draws using RAF to avoid redundant draws
    const scheduleDraw = () => {
      if (drawRequestRef.current !== null) return; // Already scheduled
      drawRequestRef.current = requestAnimationFrame(() => {
        drawRequestRef.current = null;
        draw();
      });
    };

    map.on('move', scheduleDraw);
    map.on('moveend', scheduleDraw);
    map.on('zoom', scheduleDraw);
    map.on('resize', scheduleDraw);

    // Initial draw
    scheduleDraw();

    return () => {
      map.off('move', scheduleDraw);
      map.off('moveend', scheduleDraw);
      map.off('zoom', scheduleDraw);
      map.off('resize', scheduleDraw);
      // Cancel any pending draw
      if (drawRequestRef.current !== null) {
        cancelAnimationFrame(drawRequestRef.current);
      }
    };
  }, [map, draw]);

  // Redraw when pixels or selection changes
  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
}
