import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { toast } from 'sonner';

import { CanvasOverlay } from './CanvasOverlay';
import { MapToolbar } from './MapToolbar';
import { ColorPalette } from './ColorPalette';
import { ZoomControls } from './ZoomControls';
import { ActionConfirmDialog } from './ActionConfirmDialog';
import { usePixelStore, screenToPixel } from './hooks/usePixelStore';
import { useSelection } from './hooks/useSelection';
import { useMapState, Z_PAINT } from './hooks/useMapState';
import { useSupabasePixels } from '@/hooks/useSupabasePixels';
import { useGameActions, type GameMode, type ValidateResult } from '@/hooks/useGameActions';
import { useWallet } from '@/contexts/WalletContext';

const MAX_ZOOM = 22;

export function BitplaceMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [hoverPixel, setHoverPixel] = useState<{ x: number; y: number } | null>(null);
  
  // Action dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingPixels, setPendingPixels] = useState<{ x: number; y: number }[]>([]);
  const [pePerPixel, setPePerPixel] = useState(1);
  
  const { user, refreshUser } = useWallet();
  const { localPixels, paintPixel, mergePixels, confirmPixel } = usePixelStore();
  const { selection, startSelection, updateSelection, endSelection, clearSelection, getNormalizedBounds } = useSelection();
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

  // Handle action execution
  const executeAction = useCallback(async (pixelsToAct: { x: number; y: number }[]) => {
    if (!user) {
      toast.error('Please connect wallet first');
      return;
    }

    const gameMode = getGameMode(mode);
    
    // For PAINT mode with single pixel, execute directly
    if (gameMode === 'PAINT' && pixelsToAct.length === 1) {
      const result = await validate({
        mode: 'PAINT',
        pixels: pixelsToAct,
        color: selectedColor,
      });

      if (result?.ok) {
        // Optimistic local update
        const { x, y } = pixelsToAct[0];
        paintPixel(x, y, selectedColor);

        const success = await commit({
          mode: 'PAINT',
          pixels: pixelsToAct,
          color: selectedColor,
          snapshotHash: result.snapshotHash,
        });

        if (success) {
          confirmPixel(x, y);
          refreshUser();
        }
      }
      clearSelection();
      return;
    }

    // For multi-pixel or non-PAINT, show dialog
    setPendingPixels(pixelsToAct);
    
    if (gameMode === 'PAINT') {
      // Auto-validate paint actions
      const result = await validate({
        mode: 'PAINT',
        pixels: pixelsToAct,
        color: selectedColor,
      });
      setDialogOpen(true);
    } else {
      // For DEF/ATK/REINFORCE, just open dialog and let user set PE
      clearValidation();
      setDialogOpen(true);
    }
  }, [user, mode, selectedColor, validate, commit, paintPixel, confirmPixel, clearSelection, clearValidation, getGameMode, refreshUser]);

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
      if (mode !== 'paint') return; // Allow map drag in non-paint modes below Z_PAINT
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
  }, [mode]);

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

    // If it was a click (not a drag), handle single pixel
    if (dragDistance < 5) {
      if (map.getZoom() >= Z_PAINT) {
        const x = dragStartRef.current.x;
        const y = dragStartRef.current.y;
        await executeAction([{ x, y }]);
      }
    } else {
      // It was a drag, finalize selection and handle action
      endSelection();
      const bounds = getNormalizedBounds();
      if (bounds) {
        const selectedPixels = getPixelsFromBounds(bounds);
        await executeAction(selectedPixels);
      }
    }

    isDraggingRef.current = false;
    dragStartRef.current = null;
  }, [executeAction, endSelection, getNormalizedBounds, getPixelsFromBounds]);

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

  // Handle dialog confirm
  const handleConfirm = useCallback(async () => {
    if (!validationResult?.ok) return;

    const gameMode = getGameMode(mode);
    
    const success = await commit({
      mode: gameMode,
      pixels: pendingPixels,
      color: gameMode === 'PAINT' ? selectedColor : undefined,
      pePerPixel: gameMode !== 'PAINT' ? pePerPixel : undefined,
      snapshotHash: validationResult.snapshotHash,
    });

    if (success) {
      // For PAINT, apply optimistic updates
      if (gameMode === 'PAINT') {
        pendingPixels.forEach(({ x, y }) => {
          paintPixel(x, y, selectedColor);
          confirmPixel(x, y);
        });
      }
      refreshUser();
      setDialogOpen(false);
      clearSelection();
      setPendingPixels([]);
    }
  }, [validationResult, mode, pendingPixels, selectedColor, pePerPixel, commit, getGameMode, paintPixel, confirmPixel, clearSelection, refreshUser]);

  // Handle revalidate (for non-PAINT modes when PE changes)
  const handleRevalidate = useCallback(async () => {
    const gameMode = getGameMode(mode);
    
    await validate({
      mode: gameMode,
      pixels: pendingPixels,
      color: gameMode === 'PAINT' ? selectedColor : undefined,
      pePerPixel: gameMode !== 'PAINT' ? pePerPixel : undefined,
    });
  }, [mode, pendingPixels, selectedColor, pePerPixel, validate, getGameMode]);

  // Close dialog handler
  const handleDialogClose = useCallback((open: boolean) => {
    if (!open) {
      setDialogOpen(false);
      clearSelection();
      clearValidation();
      setPendingPixels([]);
    }
  }, [clearSelection, clearValidation]);

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
          invalidPixels={invalidPixels}
        />
      )}

      {/* UI Controls */}
      <MapToolbar mode={mode} onModeChange={setMode} />
      <ColorPalette selectedColor={selectedColor} onColorSelect={setSelectedColor} />
      <ZoomControls zoom={zoom} onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} />

      {/* Action Confirmation Dialog */}
      <ActionConfirmDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        mode={getGameMode(mode)}
        pixelCount={pendingPixels.length}
        validationResult={validationResult}
        pePerPixel={pePerPixel}
        onPePerPixelChange={setPePerPixel}
        onConfirm={handleConfirm}
        onRevalidate={handleRevalidate}
        isValidating={isValidating}
        isCommitting={isCommitting}
        availablePe={user?.pe_total_pe}
      />
    </div>
  );
}
