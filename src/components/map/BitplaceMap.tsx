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
import { HudOverlay, HudSlot } from './HudOverlay';
import { PixelInspectorDrawer } from './PixelInspectorDrawer';
import { WalletButton } from '@/components/wallet/WalletButton';
import { usePixelStore, screenToPixel } from './hooks/usePixelStore';
import { useSelection } from './hooks/useSelection';
import { useMapState, Z_PAINT } from './hooks/useMapState';
import { useSupabasePixels } from '@/hooks/useSupabasePixels';
import { useGameActions, type GameMode } from '@/hooks/useGameActions';
import { useWallet } from '@/contexts/WalletContext';
import { useMapUrl } from '@/hooks/useMapUrl';

const MAX_ZOOM = 22;

export function BitplaceMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [hoverPixel, setHoverPixel] = useState<{ x: number; y: number } | null>(null);
  const [inspectedPixel, setInspectedPixel] = useState<{ x: number; y: number } | null>(null);
  
  const [pendingPixels, setPendingPixels] = useState<{ x: number; y: number }[]>([]);
  const [pePerPixel, setPePerPixel] = useState(1);
  
  const { user, refreshUser } = useWallet();
  const { getUrlPosition, setUrlPosition } = useMapUrl();
  const { localPixels, paintPixel, mergePixels, confirmPixel } = usePixelStore();
  const { selection, startSelection, updateSelection, endSelection, clearSelection, getNormalizedBounds, getSelectedPixels } = useSelection();
  const { mode, selectedColor, zoom, artOpacity, setMode, setSelectedColor, setZoom, toggleArtOpacity, canPaint } = useMapState();
  const { dbPixels, updateViewport } = useSupabasePixels(zoom);
  const { validate, commit, validationResult, invalidPixels, isValidating, isCommitting, clearValidation } = useGameActions();

  const pixels = useMemo(() => mergePixels(dbPixels), [mergePixels, dbPixels]);

  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number; screenX: number; screenY: number } | null>(null);
  const setZoomRef = useRef(setZoom);
  const updateViewportRef = useRef(updateViewport);

  useEffect(() => {
    setZoomRef.current = setZoom;
    updateViewportRef.current = updateViewport;
  }, [setZoom, updateViewport]);

  const getGameMode = useCallback((mapMode: string): GameMode => {
    return mapMode.toUpperCase() as GameMode;
  }, []);

  // Track URL pixel to open on load
  const urlPixelRef = useRef<{ x: number; y: number } | null>(null);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    
    // Check for URL params for initial position
    const urlPos = getUrlPosition();
    
    // Store pixel coords from URL to open after map ready
    if (urlPos?.pixelX !== undefined && urlPos?.pixelY !== undefined) {
      urlPixelRef.current = { x: urlPos.pixelX, y: urlPos.pixelY };
    }
    
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: urlPos ? [urlPos.lng, urlPos.lat] : [0, 20],
      zoom: urlPos ? urlPos.zoom : 2,
      minZoom: 2,
      maxZoom: 22,
    });

    map.on('load', () => {
      mapRef.current = map;
      setMapReady(true);
      
      // Open inspector for URL pixel after a brief delay for map to settle
      if (urlPixelRef.current) {
        setTimeout(() => {
          setInspectedPixel(urlPixelRef.current);
          urlPixelRef.current = null;
        }, 500);
      }
    });

    map.on('zoom', () => setZoomRef.current(map.getZoom()));

    const updateBounds = () => {
      if (!map) return;
      const bounds = map.getBounds();
      const worldSize = Math.pow(2, MAX_ZOOM) * 256;
      const minX = Math.floor(((bounds.getWest() + 180) / 360) * worldSize);
      const maxX = Math.floor(((bounds.getEast() + 180) / 360) * worldSize);
      const minLat = bounds.getSouth();
      const maxLat = bounds.getNorth();
      const minY = Math.floor(((1 - Math.log(Math.tan((maxLat * Math.PI) / 180) + 1 / Math.cos((maxLat * Math.PI) / 180)) / Math.PI) / 2) * worldSize);
      const maxY = Math.floor(((1 - Math.log(Math.tan((minLat * Math.PI) / 180) + 1 / Math.cos((minLat * Math.PI) / 180)) / Math.PI) / 2) * worldSize);
      updateViewportRef.current({ minX, maxX, minY, maxY });
    };

    map.on('moveend', updateBounds);
    map.on('zoomend', updateBounds);

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Listen for navigation events from SearchModal
  useEffect(() => {
    const handleNavigate = (e: Event) => {
      const detail = (e as CustomEvent<{ lat: number; lng: number; zoom?: number }>).detail;
      if (!mapRef.current || !detail) return;
      
      const { lat, lng, zoom: targetZoom } = detail;
      const finalZoom = targetZoom || Math.max(8, mapRef.current.getZoom());
      
      mapRef.current.flyTo({ 
        center: [lng, lat], 
        zoom: finalZoom,
        duration: 2000,
      });
      
      // Update URL
      setUrlPosition(lat, lng, finalZoom);
    };

    window.addEventListener('bitplace:navigate', handleNavigate);
    return () => window.removeEventListener('bitplace:navigate', handleNavigate);
  }, [setUrlPosition]);

  useEffect(() => {
    const selectedPixels = getSelectedPixels();
    if (selectedPixels.length > 0) setPendingPixels(selectedPixels);
  }, [selection.bounds, getSelectedPixels]);

  const executeSinglePixelAction = useCallback(async (x: number, y: number) => {
    if (!user) { toast.error('Please connect wallet first'); return; }
    const gameMode = getGameMode(mode);
    if (gameMode === 'PAINT') {
      const result = await validate({ mode: 'PAINT', pixels: [{ x, y }], color: selectedColor });
      if (result?.ok) {
        paintPixel(x, y, selectedColor);
        const success = await commit({ mode: 'PAINT', pixels: [{ x, y }], color: selectedColor, snapshotHash: result.snapshotHash });
        if (success) { confirmPixel(x, y); refreshUser(); }
      }
      return;
    }
    startSelection(x, y);
    setPendingPixels([{ x, y }]);
  }, [user, mode, selectedColor, validate, commit, paintPixel, confirmPixel, getGameMode, refreshUser, startSelection]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const handleMapMouseMove = (e: maplibregl.MapMouseEvent) => {
      if (map.getZoom() >= Z_PAINT) {
        const pixel = screenToPixel(e.point.x, e.point.y, map);
        setHoverPixel(pixel);
        if (isDraggingRef.current && dragStartRef.current) updateSelection(pixel.x, pixel.y);
      } else { setHoverPixel(null); }
    };

    const handleMapMouseDown = (e: maplibregl.MapMouseEvent) => {
      if (map.getZoom() < Z_PAINT) return;
      const pixel = screenToPixel(e.point.x, e.point.y, map);
      isDraggingRef.current = true;
      dragStartRef.current = { x: pixel.x, y: pixel.y, screenX: e.point.x, screenY: e.point.y };
      map.dragPan.disable();
      startSelection(pixel.x, pixel.y);
    };

    const handleMapMouseUp = async (e: maplibregl.MapMouseEvent) => {
      map.dragPan.enable();
      if (!isDraggingRef.current || !dragStartRef.current) return;
      const dragDistance = Math.sqrt(Math.pow(e.point.x - dragStartRef.current.screenX, 2) + Math.pow(e.point.y - dragStartRef.current.screenY, 2));
      if (dragDistance < 5) {
        if (map.getZoom() >= Z_PAINT) {
          const { x, y } = dragStartRef.current;
          const gameMode = getGameMode(mode);
          if (gameMode === 'PAINT') {
            // Direct paint on single click
            await executeSinglePixelAction(x, y);
            clearSelection();
          } else {
            // Open inspector for DEFEND/ATTACK modes
            setInspectedPixel({ x, y });
            clearSelection();
          }
        }
      } else { endSelection(); }
      isDraggingRef.current = false;
      dragStartRef.current = null;
    };

    const handleMapMouseLeave = () => {
      setHoverPixel(null);
      if (isDraggingRef.current) { endSelection(); isDraggingRef.current = false; dragStartRef.current = null; map.dragPan.enable(); }
    };

    map.on('mousemove', handleMapMouseMove);
    map.on('mousedown', handleMapMouseDown);
    map.on('mouseup', handleMapMouseUp);
    map.getCanvas().addEventListener('mouseleave', handleMapMouseLeave);

    return () => {
      map.off('mousemove', handleMapMouseMove);
      map.off('mousedown', handleMapMouseDown);
      map.off('mouseup', handleMapMouseUp);
      map.getCanvas().removeEventListener('mouseleave', handleMapMouseLeave);
    };
  }, [mapReady, mode, updateSelection, startSelection, endSelection, clearSelection, executeSinglePixelAction, getGameMode]);

  const handleZoomIn = useCallback(() => mapRef.current?.zoomIn(), []);
  const handleZoomOut = useCallback(() => mapRef.current?.zoomOut(), []);

  const handleValidate = useCallback(async () => {
    if (!user) { toast.error('Please connect wallet first'); return; }
    const gameMode = getGameMode(mode);
    await validate({ mode: gameMode, pixels: pendingPixels, color: gameMode === 'PAINT' ? selectedColor : undefined, pePerPixel: gameMode !== 'PAINT' ? pePerPixel : undefined });
  }, [user, mode, pendingPixels, selectedColor, pePerPixel, validate, getGameMode]);

  const handleConfirm = useCallback(async () => {
    const gameMode = getGameMode(mode);
    if (!validationResult?.ok) {
      if (gameMode === 'PAINT') {
        const result = await validate({ mode: 'PAINT', pixels: pendingPixels, color: selectedColor });
        if (!result?.ok) return;
        const success = await commit({ mode: 'PAINT', pixels: pendingPixels, color: selectedColor, snapshotHash: result.snapshotHash });
        if (success) { pendingPixels.forEach(({ x, y }) => { paintPixel(x, y, selectedColor); confirmPixel(x, y); }); refreshUser(); handleClearSelection(); }
      }
      return;
    }
    const success = await commit({ mode: gameMode, pixels: pendingPixels, color: gameMode === 'PAINT' ? selectedColor : undefined, pePerPixel: gameMode !== 'PAINT' ? pePerPixel : undefined, snapshotHash: validationResult.snapshotHash });
    if (success) {
      if (gameMode === 'PAINT') pendingPixels.forEach(({ x, y }) => { paintPixel(x, y, selectedColor); confirmPixel(x, y); });
      refreshUser(); handleClearSelection();
    }
  }, [validationResult, mode, pendingPixels, selectedColor, pePerPixel, commit, validate, getGameMode, paintPixel, confirmPixel, refreshUser]);

  const handleClearSelection = useCallback(() => { clearSelection(); clearValidation(); setPendingPixels([]); }, [clearSelection, clearValidation]);

  // Inspector card handlers
  const handleInspectorPaint = useCallback(async (x: number, y: number) => {
    await executeSinglePixelAction(x, y);
  }, [executeSinglePixelAction]);

  const handleInspectorDefendAttack = useCallback((x: number, y: number, targetMode: 'DEFEND' | 'ATTACK') => {
    setMode(targetMode.toLowerCase() as 'paint' | 'defend' | 'attack');
    startSelection(x, y);
    setPendingPixels([{ x, y }]);
  }, [setMode, startSelection]);

  const handleCloseInspector = useCallback(() => {
    setInspectedPixel(null);
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col">
      <div className="flex-1 flex relative overflow-hidden">
        <div className="flex-1 relative">
          <div ref={containerRef} className="absolute inset-0" />

          {mapReady && (
            <CanvasOverlay map={mapRef.current} pixels={pixels} selection={selection} hoverPixel={hoverPixel} canPaint={canPaint} invalidPixels={invalidPixels} artOpacity={artOpacity} />
          )}

          {mapReady && <DevDiagnostics map={mapRef.current} zoom={zoom} canPaint={canPaint} isSelecting={selection.isSelecting} />}

          {/* HUD Overlay */}
          <HudOverlay>
            <HudSlot position="top-center">
              <MapToolbar mode={mode} onModeChange={setMode} />
            </HudSlot>
            <HudSlot position="top-right">
              <WalletButton />
            </HudSlot>
            <HudSlot position="bottom-right">
              <ZoomControls zoom={zoom} onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} artOpacity={artOpacity} onToggleArtOpacity={toggleArtOpacity} />
            </HudSlot>
          </HudOverlay>

          {/* Pixel Inspector Card/Drawer */}
          <PixelInspectorDrawer
            pixel={inspectedPixel}
            onClose={handleCloseInspector}
            onPaint={handleInspectorPaint}
            onDefendAttack={handleInspectorDefendAttack}
            selectedColor={selectedColor}
            mode={getGameMode(mode)}
            currentUserId={user?.id}
          />
        </div>

        {canPaint && (
          <InspectorPanel selectedPixels={pendingPixels} mode={getGameMode(mode)} selectedColor={selectedColor} currentUserId={user?.id} validationResult={validationResult} invalidPixels={invalidPixels} pePerPixel={pePerPixel} onPePerPixelChange={setPePerPixel} onColorSelect={setSelectedColor} onValidate={handleValidate} onConfirm={handleConfirm} onClearSelection={handleClearSelection} isValidating={isValidating} isCommitting={isCommitting} />
        )}
      </div>
      <StatusStrip userId={user?.id} />
    </div>
  );
}
