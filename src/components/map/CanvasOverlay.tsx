import { useEffect, useRef, useCallback } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';
import {
  type PixelStore,
  parsePixelKey,
  pixelToScreen,
  getPixelScreenSize,
  screenToPixel,
} from './hooks/usePixelStore';
import { type SelectionState } from './hooks/useSelection';
import { Z_PAINT } from './hooks/useMapState';

interface CanvasOverlayProps {
  map: MapLibreMap | null;
  pixels: PixelStore;
  selection: SelectionState;
  hoverPixel: { x: number; y: number } | null;
  canPaint: boolean;
}

export function CanvasOverlay({
  map,
  pixels,
  selection,
  hoverPixel,
  canPaint,
}: CanvasOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !map) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const zoom = map.getZoom();
    const pixelSize = getPixelScreenSize(map);

    // Only render pixels that are visible (optimization)
    if (pixelSize > 0.5) {
      // Get visible bounds
      const bounds = map.getBounds();
      const topLeft = screenToPixel(0, 0, map);
      const bottomRight = screenToPixel(width, height, map);

      // Draw painted pixels
      pixels.forEach((data, key) => {
        const { x, y } = parsePixelKey(key);
        
        // Quick bounds check
        if (x < topLeft.x - 1 || x > bottomRight.x + 1) return;
        if (y < topLeft.y - 1 || y > bottomRight.y + 1) return;

        const screenPos = pixelToScreen(x, y, map);
        
        ctx.fillStyle = data.color;
        ctx.fillRect(screenPos.x, screenPos.y, pixelSize, pixelSize);
      });
    }

    // Draw hover highlight at paint zoom
    if (hoverPixel && canPaint && pixelSize > 1) {
      const screenPos = pixelToScreen(hoverPixel.x, hoverPixel.y, map);
      
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.strokeRect(screenPos.x, screenPos.y, pixelSize, pixelSize);
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(screenPos.x, screenPos.y, pixelSize, pixelSize);
    }

    // Draw selection rectangle
    if (selection.bounds) {
      const { startX, startY, endX, endY } = selection.bounds;
      const minX = Math.min(startX, endX);
      const maxX = Math.max(startX, endX);
      const minY = Math.min(startY, endY);
      const maxY = Math.max(startY, endY);

      const topLeftScreen = pixelToScreen(minX, minY, map);
      const bottomRightScreen = pixelToScreen(maxX + 1, maxY + 1, map);

      const rectWidth = bottomRightScreen.x - topLeftScreen.x;
      const rectHeight = bottomRightScreen.y - topLeftScreen.y;

      // Selection fill
      ctx.fillStyle = 'rgba(0, 200, 255, 0.15)';
      ctx.fillRect(topLeftScreen.x, topLeftScreen.y, rectWidth, rectHeight);

      // Selection border
      ctx.strokeStyle = 'rgba(0, 200, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(topLeftScreen.x, topLeftScreen.y, rectWidth, rectHeight);
      ctx.setLineDash([]);

      // Selection count badge
      if (selection.pixelCount > 0) {
        const badgeText = `${selection.pixelCount.toLocaleString()} px`;
        ctx.font = '12px system-ui, sans-serif';
        const textMetrics = ctx.measureText(badgeText);
        const badgePadding = 6;
        const badgeHeight = 20;
        const badgeWidth = textMetrics.width + badgePadding * 2;
        
        const badgeX = topLeftScreen.x + rectWidth / 2 - badgeWidth / 2;
        const badgeY = topLeftScreen.y - badgeHeight - 8;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 4);
        ctx.fill();

        ctx.fillStyle = '#00C8FF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeText, badgeX + badgeWidth / 2, badgeY + badgeHeight / 2);
      }
    }
  }, [map, pixels, selection, hoverPixel, canPaint]);

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
      style={{ touchAction: 'none' }}
    />
  );
}
