import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { toast } from 'sonner';

import { CanvasOverlay } from './CanvasOverlay';
import { MapToolbar } from './MapToolbar';
import { ColorPalette } from './ColorPalette';
import { ZoomControls } from './ZoomControls';
import { usePixelStore, screenToPixel } from './hooks/usePixelStore';
import { useSelection } from './hooks/useSelection';
import { useMapState, Z_PAINT } from './hooks/useMapState';

export function BitplaceMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [hoverPixel, setHoverPixel] = useState<{ x: number; y: number } | null>(null);
  
  const { pixels, paintPixel } = usePixelStore();
  const { selection, startSelection, updateSelection, endSelection, clearSelection } = useSelection();
  const { mode, selectedColor, zoom, setMode, setSelectedColor, setZoom, canPaint } = useMapState();

  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number; screenX: number; screenY: number } | null>(null);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [0, 20],
      zoom: 2,
      minZoom: 2,
      maxZoom: 22,
    });

    map.on('load', () => {
      mapRef.current = map;
      setMapReady(true);
    });

    map.on('zoom', () => {
      setZoom(map.getZoom());
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [setZoom]);

  // Handle mouse move for hover
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const map = mapRef.current;
    if (!map) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (map.getZoom() >= Z_PAINT) {
      const pixel = screenToPixel(x, y, map);
      setHoverPixel(pixel);

      // Handle drag selection
      if (isDraggingRef.current && dragStartRef.current) {
        updateSelection(pixel.x, pixel.y);
      }
    } else {
      setHoverPixel(null);
    }
  }, [updateSelection]);

  // Handle mouse down
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const map = mapRef.current;
    if (!map || mode !== 'paint') return;

    if (map.getZoom() < Z_PAINT) {
      toast.info('Zoom in to paint', { duration: 2000 });
      return;
    }

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pixel = screenToPixel(x, y, map);

    // Start potential drag
    isDraggingRef.current = true;
    dragStartRef.current = { x: pixel.x, y: pixel.y, screenX: e.clientX, screenY: e.clientY };

    // Disable map dragging when we're in paint mode at paint zoom
    map.dragPan.disable();
  }, [mode]);

  // Handle mouse up
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const map = mapRef.current;
    if (!map) return;

    map.dragPan.enable();

    if (!isDraggingRef.current || !dragStartRef.current) return;

    const dragDistance = Math.sqrt(
      Math.pow(e.clientX - dragStartRef.current.screenX, 2) +
      Math.pow(e.clientY - dragStartRef.current.screenY, 2)
    );

    // If it was a click (not a drag), paint single pixel
    if (dragDistance < 5) {
      if (mode === 'paint' && map.getZoom() >= Z_PAINT) {
        paintPixel(dragStartRef.current.x, dragStartRef.current.y, selectedColor);
        clearSelection();
      }
    } else {
      // It was a drag, finalize selection
      endSelection();
    }

    isDraggingRef.current = false;
    dragStartRef.current = null;
  }, [mode, selectedColor, paintPixel, clearSelection, endSelection]);

  // Start selection on drag
  useEffect(() => {
    if (!isDraggingRef.current || !dragStartRef.current) return;
    
    const map = mapRef.current;
    if (!map || map.getZoom() < Z_PAINT) return;

    startSelection(dragStartRef.current.x, dragStartRef.current.y);
  }, [hoverPixel, startSelection]);

  const handleZoomIn = useCallback(() => {
    mapRef.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    mapRef.current?.zoomOut();
  }, []);

  return (
    <div className="relative w-full h-full">
      {/* Map container */}
      <div
        ref={containerRef}
        className="absolute inset-0"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setHoverPixel(null);
          if (isDraggingRef.current) {
            endSelection();
            isDraggingRef.current = false;
            dragStartRef.current = null;
            mapRef.current?.dragPan.enable();
          }
        }}
      />

      {/* Canvas overlay for pixels */}
      {mapReady && (
        <CanvasOverlay
          map={mapRef.current}
          pixels={pixels}
          selection={selection}
          hoverPixel={hoverPixel}
          canPaint={canPaint}
        />
      )}

      {/* UI Controls */}
      <MapToolbar mode={mode} onModeChange={setMode} />
      <ColorPalette selectedColor={selectedColor} onColorSelect={setSelectedColor} />
      <ZoomControls zoom={zoom} onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} />
    </div>
  );
}
