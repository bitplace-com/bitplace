import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { toast } from 'sonner';

import { CanvasOverlay } from './CanvasOverlay';
import { MapToolbar } from './MapToolbar';
import { ColorPalette } from './ColorPalette';
import { ZoomControls } from './ZoomControls';
import { usePixelStore, screenToPixel, pixelToScreen } from './hooks/usePixelStore';
import { useSelection } from './hooks/useSelection';
import { useMapState, Z_PAINT } from './hooks/useMapState';
import { useSupabasePixels } from '@/hooks/useSupabasePixels';

const MAX_ZOOM = 22;

export function BitplaceMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [hoverPixel, setHoverPixel] = useState<{ x: number; y: number } | null>(null);
  
  const { localPixels, paintPixel, mergePixels, confirmPixel } = usePixelStore();
  const { selection, startSelection, updateSelection, endSelection, clearSelection } = useSelection();
  const { mode, selectedColor, zoom, setMode, setSelectedColor, setZoom, canPaint } = useMapState();
  const { dbPixels, updateViewport, paintPixelToDb } = useSupabasePixels(zoom);

  // Merge local and DB pixels for rendering
  const pixels = useMemo(() => mergePixels(dbPixels), [mergePixels, dbPixels]);

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

    // Update viewport bounds for pixel fetching
    const updateBounds = () => {
      if (!map) return;
      const bounds = map.getBounds();
      const worldSize = Math.pow(2, MAX_ZOOM) * 256;
      
      const minX = Math.floor(((bounds.getWest() + 180) / 360) * worldSize);
      const maxX = Math.floor(((bounds.getEast() + 180) / 360) * worldSize);
      
      const minLat = bounds.getSouth();
      const maxLat = bounds.getNorth();
      
      const minY = Math.floor(
        ((1 - Math.log(Math.tan((maxLat * Math.PI) / 180) + 1 / Math.cos((maxLat * Math.PI) / 180)) / Math.PI) / 2) * worldSize
      );
      const maxY = Math.floor(
        ((1 - Math.log(Math.tan((minLat * Math.PI) / 180) + 1 / Math.cos((minLat * Math.PI) / 180)) / Math.PI) / 2) * worldSize
      );

      updateViewport({ minX, maxX, minY, maxY });
    };

    map.on('moveend', updateBounds);
    map.on('zoomend', updateBounds);

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
        const x = dragStartRef.current.x;
        const y = dragStartRef.current.y;
        
        // Optimistic local update
        paintPixel(x, y, selectedColor);
        clearSelection();
        
        // Persist to database
        paintPixelToDb(x, y, selectedColor).then((success) => {
          if (success) {
            confirmPixel(x, y);
          } else {
            toast.error('Failed to save pixel');
          }
        });
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
