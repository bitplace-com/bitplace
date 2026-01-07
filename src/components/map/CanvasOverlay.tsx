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

interface CanvasOverlayProps {
  map: MapLibreMap | null;
  pixels: PixelStore;
  selection: SelectionState;
  hoverPixel: { x: number; y: number } | null;
  canPaint: boolean;
  invalidPixels?: InvalidPixel[];
  artOpacity?: number;
  mode?: GameMode;
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
}: CanvasOverlayProps) {
  const modeColors = getModeColors(mode);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
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

      // OPTIMIZATION: Batch pixels by color to minimize fillStyle changes
      const colorBatches = new Map<string, { x: number; y: number }[]>();
      
      pixels.forEach((data, key) => {
        const { x, y } = parsePixelKey(key);
        
        // Quick bounds check with margin
        if (x < topLeft.x - 1 || x > brGrid.x + 1) return;
        if (y < topLeft.y - 1 || y > brGrid.y + 1) return;

        if (!colorBatches.has(data.color)) {
          colorBatches.set(data.color, []);
        }
        colorBatches.get(data.color)!.push({ x, y });
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
  }, [map, pixels, selection, hoverPixel, canPaint, invalidPixels, artOpacity, mode, modeColors]);

  useEffect(() => {
    if (!map) return;

    const handleRender = () => {
      requestAnimationFrame(draw);
    };

    map.on('move', handleRender);
    map.on('moveend', handleRender);
    map.on('zoom', handleRender);
    map.on('resize', handleRender);

    // Initial draw
    handleRender();

    return () => {
      map.off('move', handleRender);
      map.off('moveend', handleRender);
      map.off('zoom', handleRender);
      map.off('resize', handleRender);
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
