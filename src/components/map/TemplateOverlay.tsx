import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type maplibregl from 'maplibre-gl';
import type { Template } from '@/hooks/useTemplates';
import { lngLatToGridFloat, lngLatToGridInt, getCellSize } from '@/lib/pixelGrid';
import { quantizeImage, type QuantizedPixel } from '@/lib/paletteQuantizer';
import { cn } from '@/lib/utils';

interface TemplateOverlayProps {
  map: maplibregl.Map | null;
  template: Template;
  selectedColor?: string | null;  // Current palette color for highlighting
}

export function TemplateOverlay({ map, template, selectedColor }: TemplateOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Load image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
    };
    img.src = template.objectUrl;
    
    return () => {
      imageRef.current = null;
      setImageLoaded(false);
    };
  }, [template.objectUrl]);

  // Memoize quantized pixels - only recompute when relevant properties change
  const quantizedPixels = useMemo<QuantizedPixel[]>(() => {
    if (!imageLoaded || !imageRef.current || template.mode !== 'pixelGuide') {
      return [];
    }
    return quantizeImage(imageRef.current, template.scale, {
      excludeSpecial: template.excludeSpecial,
    });
  }, [imageLoaded, template.mode, template.scale, template.excludeSpecial]);

  // Render Image mode
  const renderImageMode = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const img = imageRef.current;
    if (!canvas || !ctx || !img || !map) return;

    // Get canvas size from container
    const container = map.getContainer();
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Set canvas size (handle DPR for crisp rendering)
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Use grid-relative positioning (same as CanvasOverlay)
    const zoom = map.getZoom();
    const cellSize = getCellSize(zoom);
    
    // Get viewport top-left in float grid coords
    const tlLngLat = map.unproject([0, 0]);
    const tlGrid = lngLatToGridFloat(tlLngLat.lng, tlLngLat.lat);

    // Calculate screen position from grid coords
    const screenX = (template.positionX - tlGrid.x) * cellSize;
    const screenY = (template.positionY - tlGrid.y) * cellSize;

    // Calculate scaled dimensions
    const scale = template.scale / 100;
    const displayWidth = img.width * scale * cellSize;
    const displayHeight = img.height * scale * cellSize;

    // Center of the image for rotation
    const centerX = screenX + displayWidth / 2;
    const centerY = screenY + displayHeight / 2;

    ctx.save();
    ctx.globalAlpha = template.opacity / 100;
    ctx.imageSmoothingEnabled = false;

    // Apply rotation around center
    if (template.rotation !== 0) {
      ctx.translate(centerX, centerY);
      ctx.rotate((template.rotation * Math.PI) / 180);
      ctx.translate(-centerX, -centerY);
    }

    // Draw at grid-aligned position
    ctx.drawImage(img, screenX, screenY, displayWidth, displayHeight);

    ctx.restore();
  }, [map, template.positionX, template.positionY, template.scale, template.opacity, template.rotation]);

  // Render Pixel Guide mode - OPTIMIZED with grid-relative math
  const renderPixelGuideMode = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !map || quantizedPixels.length === 0) return;

    // Get canvas size from container
    const container = map.getContainer();
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Set canvas size
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // === OPTIMIZATION: Calculate anchor position ONCE ===
    const zoom = map.getZoom();
    const cellSize = getCellSize(zoom);
    
    // Get viewport top-left in float grid coords (same as CanvasOverlay)
    const tlLngLat = map.unproject([0, 0]);
    const tlGrid = lngLatToGridFloat(tlLngLat.lng, tlLngLat.lat);
    
    // Visible bounds for culling
    const brLngLat = map.unproject([width, height]);
    const brGrid = lngLatToGridInt(brLngLat.lng, brLngLat.lat);
    const topLeft = lngLatToGridInt(tlLngLat.lng, tlLngLat.lat);

    // Highlight mode settings
    const highlightMode = template.highlightSelectedColor && selectedColor;
    const highlightHex = selectedColor?.toUpperCase();

    // Group pixels by color (batch rendering)
    const colorBatches = new Map<string, { dx: number; dy: number }[]>();

    for (const pixel of quantizedPixels) {
      const gridX = template.positionX + pixel.dx;
      const gridY = template.positionY + pixel.dy;

      // Quick bounds check (skip if off-screen)
      if (gridX < topLeft.x - 1 || gridX > brGrid.x + 1) continue;
      if (gridY < topLeft.y - 1 || gridY > brGrid.y + 1) continue;

      const hexColor = pixel.hexColor;
      if (!colorBatches.has(hexColor)) {
        colorBatches.set(hexColor, []);
      }
      colorBatches.get(hexColor)!.push({ dx: pixel.dx, dy: pixel.dy });
    }

    // Base opacity for guide
    const baseOpacity = template.opacity / 100;
    
    // Circle radius = 40% of cell size (means 80% diameter, like Bplace)
    const radius = cellSize * 0.4;

    // Draw batched by color - using circles for visibility
    colorBatches.forEach((positions, color) => {
      // Determine opacity based on highlight mode
      let alpha = baseOpacity * 0.85;
      if (highlightMode) {
        if (color === highlightHex) {
          alpha = baseOpacity; // Full opacity for selected color
        } else {
          alpha = baseOpacity * 0.15; // Very dim for non-selected
        }
      }

      ctx.fillStyle = color;
      ctx.globalAlpha = alpha;

      // Batch all circles of same color in one path for performance
      ctx.beginPath();
      for (const { dx, dy } of positions) {
        const gridX = template.positionX + dx;
        const gridY = template.positionY + dy;
        
        // Calculate screen position using GRID MATH (no map.project calls!)
        const screenX = (gridX - tlGrid.x) * cellSize + cellSize / 2; // Center of cell
        const screenY = (gridY - tlGrid.y) * cellSize + cellSize / 2;

        ctx.moveTo(screenX + radius, screenY);
        ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
      }
      ctx.fill();
    });

    ctx.globalAlpha = 1;
  }, [map, template.positionX, template.positionY, template.opacity, template.highlightSelectedColor, quantizedPixels, selectedColor]);

  // Main render function
  const renderOverlay = useCallback(() => {
    if (!imageLoaded || !map) return;

    if (template.mode === 'pixelGuide') {
      renderPixelGuideMode();
    } else {
      renderImageMode();
    }
  }, [imageLoaded, map, template.mode, renderImageMode, renderPixelGuideMode]);

  // Re-render on map movement
  useEffect(() => {
    if (!map || !imageLoaded) return;

    // Initial render
    renderOverlay();

    // Listen to map events
    const handleMove = () => renderOverlay();
    
    map.on('move', handleMove);
    map.on('zoom', handleMove);
    map.on('resize', handleMove);

    return () => {
      map.off('move', handleMove);
      map.off('zoom', handleMove);
      map.off('resize', handleMove);
    };
  }, [map, imageLoaded, renderOverlay]);

  // Re-render when template or selectedColor changes
  useEffect(() => {
    if (imageLoaded) renderOverlay();
  }, [
    template.opacity, 
    template.scale, 
    template.positionX, 
    template.positionY,
    template.rotation,
    template.mode,
    template.highlightSelectedColor,
    selectedColor,
    renderOverlay, 
    imageLoaded,
  ]);

  // Dynamic z-index based on showAbovePixels
  const zIndex = template.showAbovePixels ? 'z-[6]' : 'z-[4]';

  return (
    <canvas
      ref={canvasRef}
      className={cn("absolute inset-0 pointer-events-none", zIndex)}
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
