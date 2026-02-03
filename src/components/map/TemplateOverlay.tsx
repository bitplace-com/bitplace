import { useEffect, useRef, useState, useCallback } from 'react';
import type maplibregl from 'maplibre-gl';
import type { Template } from '@/hooks/useTemplates';
import { gridIntToLngLat } from '@/lib/pixelGrid';

interface TemplateOverlayProps {
  map: maplibregl.Map | null;
  template: Template;
}

export function TemplateOverlay({ map, template }: TemplateOverlayProps) {
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

  // Render overlay synced with map
  const renderOverlay = useCallback(() => {
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
    // Template position is in grid coordinates, convert to lng/lat then to screen
    const { lng, lat } = gridIntToLngLat(template.positionX, template.positionY);
    const screenPos = map.project([lng, lat]);

    // Calculate scaled dimensions (scale is percentage, so 100 = 1x)
    const scale = template.scale / 100;
    const scaledWidth = img.width * scale;
    const scaledHeight = img.height * scale;

    // Get current zoom to adjust pixel size
    // At zoom 22, 1 grid unit ≈ 1 pixel on screen
    // Scale the image relative to grid units
    const zoom = map.getZoom();
    const pixelSize = Math.pow(2, zoom - 22); // How many screen pixels per grid unit
    
    const displayWidth = scaledWidth * pixelSize;
    const displayHeight = scaledHeight * pixelSize;

    // Draw centered at the position
    ctx.globalAlpha = template.opacity / 100;
    ctx.imageSmoothingEnabled = false; // Crisp pixels
    ctx.drawImage(
      img,
      screenPos.x - displayWidth / 2,
      screenPos.y - displayHeight / 2,
      displayWidth,
      displayHeight
    );
    ctx.globalAlpha = 1;
  }, [map, template, imageLoaded]);

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

  // Re-render when template changes
  useEffect(() => {
    if (imageLoaded) renderOverlay();
  }, [template.opacity, template.scale, template.positionX, template.positionY, renderOverlay, imageLoaded]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-[4] pointer-events-none"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
