import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { toast } from 'sonner';

import { CanvasOverlay } from './CanvasOverlay';
import { MapToolbar } from './MapToolbar';
import { ZoomControls } from './ZoomControls';
import { InspectorPanel } from './inspector';
import { StatusStrip } from './StatusStrip';
import { DevDiagnostics } from './DevDiagnostics';
import { usePixelStore, screenToPixel } from './hooks/usePixelStore';
import { useSelection } from './hooks/useSelection';
import { useMapState, Z_PAINT } from './hooks/useMapState';
import { useSupabasePixels } from '@/hooks/useSupabasePixels';
import { useGameActions, type GameMode } from '@/hooks/useGameActions';
import { useWallet } from '@/contexts/WalletContext';

const MAX_ZOOM = 22;

export function BitplaceMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [hoverPixel, setHoverPixel] = useState<{ x: number; y: number } | null>(null);
  
  // Selection-based action state
  const [pendingPixels, setPendingPixels] = useState<{ x: number; y: number }[]>([]);
  const [pePerPixel, setPePerPixel] = useState(1);
  
  const { user, refreshUser } = useWallet();
  const { localPixels, paintPixel, mergePixels, confirmPixel } = usePixelStore();
  const { selection, startSelection, updateSelection, endSelection, clearSelection, getNormalizedBounds, getSelectedPixels } = useSelection();
  const { mode, selectedColor, zoom, setMode, setSelectedColor, setZoom, canPaint } = useMapState();
  const { dbPixels, updateViewport } = useSupabasePixels(zoom);
  const { 
    validate, 
    commit, 
    validationResult, 
    invalidPixels, 
    isValidating, 
    isCommitting, 
    clearValidation 
  } = useGameActions();

  // Merge local and DB pixels for rendering
  const pixels = useMemo(() => mergePixels(dbPixels), [mergePixels, dbPixels]);

  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number; screenX: number; screenY: number } | null>(null);

  // Convert MapMode to GameMode
  const getGameMode = useCallback((mapMode: string): GameMode => {
    return mapMode.toUpperCase() as GameMode;
  }, []);

  // Get pixels from selection bounds
  const getPixelsFromBounds = useCallback((bounds: { startX: number; startY: number; endX: number; endY: number }) => {
    const minX = Math.min(bounds.startX, bounds.endX);
    const maxX = Math.max(bounds.startX, bounds.endX);
    const minY = Math.min(bounds.startY, bounds.endY);
    const maxY = Math.max(bounds.startY, bounds.endY);
    
    const pixels: { x: number; y: number }[] = [];
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        pixels.push({ x, y });
      }
    }
    return pixels;
  }, []);

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
  }, [setZoom, updateViewport]);

  // Update pending pixels when selection changes
  useEffect(() => {
    const selectedPixels = getSelectedPixels();
    if (selectedPixels.length > 0) {
      setPendingPixels(selectedPixels);
    }
  }, [selection.bounds, getSelectedPixels]);

  // Handle single pixel click action
  const executeSinglePixelAction = useCallback(async (x: number, y: number) => {
    if (!user) {
      toast.error('Please connect wallet first');
      return;
    }

    const gameMode = getGameMode(mode);
    
    // For PAINT mode with single pixel, execute directly
    if (gameMode === 'PAINT') {
      const result = await validate({
        mode: 'PAINT',
        pixels: [{ x, y }],
        color: selectedColor,
      });

      if (result?.ok) {
        // Optimistic local update
        paintPixel(x, y, selectedColor);

        const success = await commit({
          mode: 'PAINT',
          pixels: [{ x, y }],
          color: selectedColor,
          snapshotHash: result.snapshotHash,
        });

        if (success) {
          confirmPixel(x, y);
          refreshUser();
        }
      }
      return;
    }

    // For non-PAINT single clicks, start selection for inspector
    startSelection(x, y);
    setPendingPixels([{ x, y }]);
  }, [user, mode, selectedColor, validate, commit, paintPixel, confirmPixel, getGameMode, refreshUser, startSelection]);

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
    if (!map) return;

    if (map.getZoom() < Z_PAINT) {
      if (mode !== 'paint') return;
      toast.info('Zoom in to interact', { duration: 2000 });
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

    // Disable map dragging when we're at paint zoom
    map.dragPan.disable();
    
    // Start selection
    startSelection(pixel.x, pixel.y);
  }, [mode, startSelection]);

  // Handle mouse up
  const handleMouseUp = useCallback(async (e: React.MouseEvent) => {
    const map = mapRef.current;
    if (!map) return;

    map.dragPan.enable();

    if (!isDraggingRef.current || !dragStartRef.current) return;

    const dragDistance = Math.sqrt(
      Math.pow(e.clientX - dragStartRef.current.screenX, 2) +
      Math.pow(e.clientY - dragStartRef.current.screenY, 2)
    );

    // If it was a click (not a drag), handle single pixel for PAINT mode
    if (dragDistance < 5) {
      if (map.getZoom() >= Z_PAINT) {
        const x = dragStartRef.current.x;
        const y = dragStartRef.current.y;
        const gameMode = getGameMode(mode);
        
        if (gameMode === 'PAINT') {
          await executeSinglePixelAction(x, y);
          clearSelection();
        }
        // For non-PAINT modes, keep the selection for inspector
      }
    } else {
      // It was a drag, finalize selection
      endSelection();
    }

    isDraggingRef.current = false;
    dragStartRef.current = null;
  }, [executeSinglePixelAction, endSelection, clearSelection, getGameMode, mode]);

  const handleZoomIn = useCallback(() => {
    mapRef.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    mapRef.current?.zoomOut();
  }, []);

  // Handle validate from inspector
  const handleValidate = useCallback(async () => {
    if (!user) {
      toast.error('Please connect wallet first');
      return;
    }

    const gameMode = getGameMode(mode);
    
    await validate({
      mode: gameMode,
      pixels: pendingPixels,
      color: gameMode === 'PAINT' ? selectedColor : undefined,
      pePerPixel: gameMode !== 'PAINT' ? pePerPixel : undefined,
    });
  }, [user, mode, pendingPixels, selectedColor, pePerPixel, validate, getGameMode]);

  // Handle confirm from inspector
  const handleConfirm = useCallback(async () => {
    if (!validationResult?.ok) {
      // If not validated, validate first for PAINT mode
      const gameMode = getGameMode(mode);
      if (gameMode === 'PAINT') {
        const result = await validate({
          mode: 'PAINT',
          pixels: pendingPixels,
          color: selectedColor,
        });
        
        if (!result?.ok) return;
        
        // Continue with commit
        const success = await commit({
          mode: 'PAINT',
          pixels: pendingPixels,
          color: selectedColor,
          snapshotHash: result.snapshotHash,
        });

        if (success) {
          pendingPixels.forEach(({ x, y }) => {
            paintPixel(x, y, selectedColor);
            confirmPixel(x, y);
          });
          refreshUser();
          handleClearSelection();
        }
        return;
      }
      return;
    }

    const gameMode = getGameMode(mode);
    
    const success = await commit({
      mode: gameMode,
      pixels: pendingPixels,
      color: gameMode === 'PAINT' ? selectedColor : undefined,
      pePerPixel: gameMode !== 'PAINT' ? pePerPixel : undefined,
      snapshotHash: validationResult.snapshotHash,
    });

    if (success) {
      if (gameMode === 'PAINT') {
        pendingPixels.forEach(({ x, y }) => {
          paintPixel(x, y, selectedColor);
          confirmPixel(x, y);
        });
      }
      refreshUser();
      handleClearSelection();
    }
  }, [validationResult, mode, pendingPixels, selectedColor, pePerPixel, commit, validate, getGameMode, paintPixel, confirmPixel, refreshUser]);

  // Handle clear selection
  const handleClearSelection = useCallback(() => {
    clearSelection();
    clearValidation();
    setPendingPixels([]);
  }, [clearSelection, clearValidation]);

  // Handle wheel events - pass through to map
  const handleWheel = useCallback((e: React.WheelEvent) => {
    // Forward wheel events to the map by temporarily disabling pointer events
    const target = e.currentTarget as HTMLElement;
    target.style.pointerEvents = 'none';
    requestAnimationFrame(() => {
      target.style.pointerEvents = canPaint ? 'auto' : 'none';
    });
  }, [canPaint]);

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Main content area */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Map area */}
        <div className="flex-1 relative">
          {/* Map container - clean, no event handlers to avoid blocking MapLibre */}
          <div
            ref={containerRef}
            className="absolute inset-0"
          />

          {/* Canvas overlay for pixels (pointer-events: none) */}
          {mapReady && (
            <CanvasOverlay
              map={mapRef.current}
              pixels={pixels}
              selection={selection}
              hoverPixel={hoverPixel}
              canPaint={canPaint}
              invalidPixels={invalidPixels}
            />
          )}

          {/* Interaction layer - only captures events at paint zoom */}
          {mapReady && (
            <div
              className="absolute inset-0"
              style={{
                pointerEvents: canPaint ? 'auto' : 'none',
              }}
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
              onWheel={handleWheel}
            />
          )}

          {/* Dev Diagnostics */}
          {mapReady && (
            <DevDiagnostics
              map={mapRef.current}
              zoom={zoom}
              canPaint={canPaint}
              isSelecting={selection.isSelecting}
            />
          )}

          {/* UI Controls */}
          <MapToolbar mode={mode} onModeChange={setMode} />
          <ZoomControls zoom={zoom} onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} />
        </div>

        {/* Inspector Panel (right side) */}
        {canPaint && (
          <InspectorPanel
            selectedPixels={pendingPixels}
            mode={getGameMode(mode)}
            selectedColor={selectedColor}
            currentUserId={user?.id}
            validationResult={validationResult}
            invalidPixels={invalidPixels}
            pePerPixel={pePerPixel}
            onPePerPixelChange={setPePerPixel}
            onColorSelect={setSelectedColor}
            onValidate={handleValidate}
            onConfirm={handleConfirm}
            onClearSelection={handleClearSelection}
            isValidating={isValidating}
            isCommitting={isCommitting}
          />
        )}
      </div>

      {/* Status Strip (bottom) */}
      <StatusStrip userId={user?.id} />
    </div>
  );
}
