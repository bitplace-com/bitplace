import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type maplibregl from 'maplibre-gl';
import type { Template } from '@/hooks/useTemplates';
import { gridIntToLngLat } from '@/lib/pixelGrid';
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
  const [quantizedPixels, setQuantizedPixels] = useState<QuantizedPixel[]>([]);

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

  // Quantize image when in Pixel Guide mode
  useEffect(() => {
    if (!imageLoaded || !imageRef.current || template.mode !== 'pixelGuide') {
      setQuantizedPixels([]);
      return;
    }

    const pixels = quantizeImage(imageRef.current, template.scale, {
      excludeSpecial: template.excludeSpecial,
    });
    setQuantizedPixels(pixels);
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
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate image position on screen
    const { lng, lat } = gridIntToLngLat(template.positionX, template.positionY);
    const screenPos = map.project([lng, lat]);

    // Calculate scaled dimensions
    const scale = template.scale / 100;
    const scaledWidth = img.width * scale;
    const scaledHeight = img.height * scale;

    // Get pixel size based on zoom
    const zoom = map.getZoom();
    const pixelSize = Math.pow(2, zoom - 22);
    
    const displayWidth = scaledWidth * pixelSize;
    const displayHeight = scaledHeight * pixelSize;

    // Center of the image for rotation
    const centerX = screenPos.x;
    const centerY = screenPos.y;

    ctx.save();
    ctx.globalAlpha = template.opacity / 100;
    ctx.imageSmoothingEnabled = false;

    // Apply rotation around center
    if (template.rotation !== 0) {
      ctx.translate(centerX, centerY);
      ctx.rotate((template.rotation * Math.PI) / 180);
      ctx.translate(-centerX, -centerY);
    }

    // Draw centered at the position
    ctx.drawImage(
      img,
      screenPos.x - displayWidth / 2,
      screenPos.y - displayHeight / 2,
      displayWidth,
      displayHeight
    );

    ctx.restore();
  }, [map, template]);

  // Render Pixel Guide mode
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
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    const zoom = map.getZoom();
    const pixelSize = Math.pow(2, zoom - 22);

    // Group pixels by color for batching
    const colorBatches = new Map<string, { screenX: number; screenY: number }[]>();

    const highlightMode = template.highlightSelectedColor && selectedColor;
    const highlightHex = selectedColor?.toUpperCase();

    for (const pixel of quantizedPixels) {
      // Calculate grid position
      const gridX = template.positionX + pixel.dx;
      const gridY = template.positionY + pixel.dy;

      // Convert to screen position
      const { lng, lat } = gridIntToLngLat(gridX, gridY);
      const screenPos = map.project([lng, lat]);

      // Skip if outside viewport (with some padding)
      if (screenPos.x < -pixelSize || screenPos.x > width + pixelSize ||
          screenPos.y < -pixelSize || screenPos.y > height + pixelSize) {
        continue;
      }

      const hexColor = pixel.hexColor;
      if (!colorBatches.has(hexColor)) {
        colorBatches.set(hexColor, []);
      }
      colorBatches.get(hexColor)!.push({ screenX: screenPos.x, screenY: screenPos.y });
    }

    // Base opacity for guide
    const baseOpacity = template.opacity / 100;

    // Draw batched by color
    colorBatches.forEach((positions, color) => {
      // Determine opacity based on highlight mode
      let alpha = baseOpacity * 0.7; // Slightly dimmer than full to distinguish from real pixels
      if (highlightMode) {
        if (color === highlightHex) {
          alpha = baseOpacity; // Full opacity for selected color
        } else {
          alpha = baseOpacity * 0.15; // Very dim for non-selected
        }
      }

      ctx.fillStyle = color;
      ctx.globalAlpha = alpha;

      for (const pos of positions) {
        // Draw slightly smaller than full pixel for visual distinction
        const size = Math.max(1, pixelSize * 0.9);
        const offset = (pixelSize - size) / 2;
        ctx.fillRect(pos.screenX + offset, pos.screenY + offset, size, size);
      }
    });

    ctx.globalAlpha = 1;
  }, [map, template, quantizedPixels, selectedColor]);

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
    quantizedPixels,
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
