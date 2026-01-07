import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { toast } from 'sonner';

import { CanvasOverlay } from './CanvasOverlay';
import { MapToolbar } from './MapToolbar';
import { ZoomControls } from './ZoomControls';
import { InspectorPanel } from './inspector';
import { StatusStrip } from './StatusStrip';
import { HudOverlay, HudSlot } from './HudOverlay';
import { PixelInspectorDrawer } from './PixelInspectorDrawer';
import { PaletteTray } from './PaletteTray';
import { GlassPanel } from '@/components/ui/glass-panel';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { WalletButton } from '@/components/wallet/WalletButton';
import { WalletSelectModal } from '@/components/modals/WalletSelectModal';
import { usePixelStore, pixelKey } from './hooks/usePixelStore';
import { useSelection } from './hooks/useSelection';
import { useMapState } from './hooks/useMapState';
import { usePaintQueue } from './hooks/usePaintQueue';
import { useSupabasePixels } from '@/hooks/useSupabasePixels';
import { useGameActions, type GameMode } from '@/hooks/useGameActions';
import { useWallet } from '@/contexts/WalletContext';
import { useWalletGate } from '@/hooks/useWalletGate';
import { useMapUrl } from '@/hooks/useMapUrl';
import { useSound } from '@/hooks/useSound';
import { lngLatToGridInt, getViewportGridBounds } from '@/lib/pixelGrid';

export function BitplaceMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [hoverPixel, setHoverPixel] = useState<{ x: number; y: number } | null>(null);
  const [inspectedPixel, setInspectedPixel] = useState<{ x: number; y: number } | null>(null);
  const [isEyedropperActive, setIsEyedropperActive] = useState(false);
  const [isSpaceHeld, setIsSpaceHeld] = useState(false);
  const [isShiftHeld, setIsShiftHeld] = useState(false);
  const lastPaintedPixelRef = useRef<{ x: number; y: number } | null>(null);
  
  const [pendingPixels, setPendingPixels] = useState<{ x: number; y: number }[]>([]);
  const [pePerPixel, setPePerPixel] = useState(1);
  
  const { user, refreshUser, connect, isConnecting } = useWallet();
  const { isWalletModalOpen, setWalletModalOpen, requireWallet } = useWalletGate();
  const { getUrlPosition, setUrlPosition } = useMapUrl();
  const { localPixels, paintPixel, mergePixels, confirmPixel } = usePixelStore();
  const { selection, startSelection, updateSelection, endSelection, clearSelection, getNormalizedBounds, getSelectedPixels } = useSelection();
  const { mode, selectedColor, zoom, artOpacity, interactionMode, setMode, setSelectedColor, setZoom, toggleArtOpacity, setInteractionMode, canPaint } = useMapState();
  const { dbPixels, updateViewport } = useSupabasePixels(zoom);
  const { validate, commit, validationResult, invalidPixels, isValidating, isCommitting, clearValidation } = useGameActions();
  const { queue: paintQueue, queueSize, isSpacePainting, isFlushing, startSpacePaint, stopSpacePaint, addToQueue, flushQueue } = usePaintQueue(paintPixel, confirmPixel);
  const { play: playSound } = useSound();

  const pixels = useMemo(() => mergePixels(dbPixels), [mergePixels, dbPixels]);

  const isDraggingRef = useRef(false);
  const isDrawingRef = useRef(false);
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
      // Disable pitch and rotation for stable grid math
      dragRotate: false,
      touchPitch: false,
      // Disable world copies for simpler coordinate handling
      renderWorldCopies: false,
      // Hide MapLibre attribution
      attributionControl: false,
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
      const gridBounds = getViewportGridBounds(
        bounds.getWest(),
        bounds.getEast(),
        bounds.getNorth(),
        bounds.getSouth()
      );
      updateViewportRef.current(gridBounds);
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

  // SPACE key handling for hover-paint, SHIFT for selection
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // SPACE: enable hover-paint mode (Paint mode only, Brush mode only)
      if (e.code === 'Space' && mode === 'paint' && canPaint && !isSpaceHeld) {
        e.preventDefault();
        // Only allow SPACE paint in Brush (draw) mode
        if (interactionMode !== 'draw') {
          toast.info('Switch to Brush to paint');
          return;
        }
        // Gate behind wallet connection
        if (!requireWallet('paint')) return;
        setIsSpaceHeld(true);
        map.dragPan.disable();
        map.getCanvas().style.cursor = 'crosshair';
        startSpacePaint();
        // Paint first pixel if hovering (only if not eraser)
        if (hoverPixel && selectedColor !== null) {
          addToQueue(hoverPixel.x, hoverPixel.y, selectedColor);
          lastPaintedPixelRef.current = hoverPixel;
        }
      }
      // SHIFT: enable selection mode
      if (e.key === 'Shift' && !isShiftHeld) {
        setIsShiftHeld(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // SPACE release: end hover-paint
      if (e.code === 'Space' && isSpaceHeld) {
        setIsSpaceHeld(false);
        stopSpacePaint();
        lastPaintedPixelRef.current = null;
        // Restore dragPan
        if (interactionMode === 'drag') {
          map.dragPan.enable();
        }
        map.getCanvas().style.cursor = interactionMode === 'draw' ? 'crosshair' : '';
      }
      // SHIFT release
      if (e.key === 'Shift' && isShiftHeld) {
        setIsShiftHeld(false);
        // End selection if was selecting
        if (selection.isSelecting) {
          endSelection();
          isDraggingRef.current = false;
          dragStartRef.current = null;
          map.dragPan.enable();
        }
      }
    };

    // Handle window blur to release modes
    const handleBlur = () => {
      if (isSpaceHeld) {
        setIsSpaceHeld(false);
        stopSpacePaint();
        lastPaintedPixelRef.current = null;
        if (interactionMode === 'drag') {
          map.dragPan.enable();
        }
        map.getCanvas().style.cursor = interactionMode === 'draw' ? 'crosshair' : '';
      }
      if (isShiftHeld) {
        setIsShiftHeld(false);
        if (selection.isSelecting) {
          endSelection();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [mapReady, mode, canPaint, user, isSpaceHeld, isShiftHeld, interactionMode, selection.isSelecting, endSelection, hoverPixel, selectedColor, addToQueue, startSpacePaint, stopSpacePaint, requireWallet]);

  // Update dragPan when interaction mode changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    if (interactionMode === 'drag') {
      map.dragPan.enable();
      map.getCanvas().style.cursor = '';
    } else {
      map.dragPan.disable();
      map.getCanvas().style.cursor = canPaint ? 'crosshair' : '';
    }
  }, [mapReady, interactionMode, canPaint]);

  useEffect(() => {
    const selectedPixels = getSelectedPixels();
    if (selectedPixels.length > 0) setPendingPixels(selectedPixels);
  }, [selection.bounds, getSelectedPixels]);

  const executeSinglePixelAction = useCallback(async (x: number, y: number) => {
    // Auth check FIRST via requireWallet
    if (!requireWallet('paint')) return;
    if (selectedColor === null) { toast.info('Select a color to paint'); return; }
    const gameMode = getGameMode(mode);
    if (gameMode === 'PAINT') {
      // Use paint queue for consistency with hover-paint
      const queued = addToQueue(x, y, selectedColor);
      if (queued) flushQueue();
      return;
    }
    startSelection(x, y);
    setPendingPixels([{ x, y }]);
  }, [requireWallet, mode, selectedColor, addToQueue, flushQueue, getGameMode, startSelection]);

  // Eyedropper: pick color from pixel
  const handleEyedropperPick = useCallback((x: number, y: number) => {
    const key = pixelKey(x, y);
    const pixel = pixels.get(key);
    if (pixel?.color) {
      setSelectedColor(pixel.color);
      toast.success(`Picked color: ${pixel.color.toUpperCase()}`);
    } else {
      toast.info('No color at this pixel');
    }
    setIsEyedropperActive(false);
  }, [pixels, setSelectedColor]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    // Update cursor based on eyedropper state or interaction mode
    const canvas = map.getCanvas();
    if (isEyedropperActive) {
      canvas.style.cursor = 'crosshair';
    } else if (interactionMode === 'draw' && canPaint) {
      canvas.style.cursor = 'crosshair';
    } else if (isSpaceHeld) {
      canvas.style.cursor = 'crosshair';
    } else {
      canvas.style.cursor = '';
    }

    const handleMapMouseMove = (e: maplibregl.MapMouseEvent) => {
      if (canPaint) {
        // Use lngLatToGridInt for grid-snapped hover
        const pixel = lngLatToGridInt(e.lngLat.lng, e.lngLat.lat);
        setHoverPixel(pixel);
        
        // SPACE held: hover-paint mode (skip if eraser, silent user check - modal shown on keydown)
        if (isSpaceHeld && mode === 'paint' && selectedColor !== null && user) {
          const last = lastPaintedPixelRef.current;
          if (!last || last.x !== pixel.x || last.y !== pixel.y) {
            addToQueue(pixel.x, pixel.y, selectedColor);
            lastPaintedPixelRef.current = pixel;
          }
        }
        // SHIFT held or non-PAINT mode dragging: update selection
        else if ((isShiftHeld || mode !== 'paint') && isDraggingRef.current && dragStartRef.current) {
          updateSelection(pixel.x, pixel.y);
        }
        // DRAW mode continuous painting (skip if eraser, silent user check - modal shown on mousedown)
        else if (interactionMode === 'draw' && isDrawingRef.current && mode === 'paint' && selectedColor !== null && user) {
          addToQueue(pixel.x, pixel.y, selectedColor);
        }
      } else { 
        setHoverPixel(null); 
      }
    };

    const handleMapMouseDown = (e: maplibregl.MapMouseEvent) => {
      if (!canPaint) return;
      
      // Handle eyedropper mode or Alt+Click
      if (isEyedropperActive || e.originalEvent.altKey) {
        const pixel = lngLatToGridInt(e.lngLat.lng, e.lngLat.lat);
        handleEyedropperPick(pixel.x, pixel.y);
        return;
      }
      
      const pixel = lngLatToGridInt(e.lngLat.lng, e.lngLat.lat);
      
      // SHIFT held or non-PAINT mode: start area selection (DEFEND/ATTACK/REINFORCE)
      if (isShiftHeld || mode !== 'paint') {
        // Gate behind wallet for non-paint modes
        if (mode !== 'paint' && !requireWallet('interact')) return;
        isDraggingRef.current = true;
        dragStartRef.current = { x: pixel.x, y: pixel.y, screenX: e.point.x, screenY: e.point.y };
        map.dragPan.disable();
        clearValidation(); // Clear previous validation on new selection
        startSelection(pixel.x, pixel.y);
        return;
      }
      
      // SPACE held: already in hover-paint, ignore mousedown
      if (isSpaceHeld) {
        return;
      }
      
      // DRAW mode: start painting (skip if eraser for now)
      if (interactionMode === 'draw' && mode === 'paint' && selectedColor !== null) {
        // Gate behind wallet connection
        if (!requireWallet('paint')) return;
        isDrawingRef.current = true;
        startSpacePaint(); // Use paint queue
        addToQueue(pixel.x, pixel.y, selectedColor);
        return;
      }
      
      // DRAG mode: record for click detection
      if (interactionMode === 'drag') {
        isDraggingRef.current = true;
        dragStartRef.current = { x: pixel.x, y: pixel.y, screenX: e.point.x, screenY: e.point.y };
      }
    };

    const handleMapMouseUp = async (e: maplibregl.MapMouseEvent) => {
      // End DRAW mode painting
      if (isDrawingRef.current) {
        isDrawingRef.current = false;
        stopSpacePaint();
        return;
      }
      
      // End SHIFT area selection or non-PAINT mode selection
      if ((isShiftHeld || mode !== 'paint') && isDraggingRef.current) {
        const dragDistance = dragStartRef.current ? Math.sqrt(
          Math.pow(e.point.x - dragStartRef.current.screenX, 2) + 
          Math.pow(e.point.y - dragStartRef.current.screenY, 2)
        ) : 0;
        
        endSelection();
        isDraggingRef.current = false;
        
        // For non-paint modes, single click selects the pixel for action
        if (mode !== 'paint' && dragDistance < 5 && dragStartRef.current) {
          const { x, y } = dragStartRef.current;
          setPendingPixels([{ x, y }]);
          playSound('pixel_select');
        }
        
        dragStartRef.current = null;
        map.dragPan.enable();
        return;
      }
      
      // Handle DRAG mode click
      if (!isDraggingRef.current || !dragStartRef.current) return;
      
      const dragDistance = Math.sqrt(
        Math.pow(e.point.x - dragStartRef.current.screenX, 2) + 
        Math.pow(e.point.y - dragStartRef.current.screenY, 2)
      );
      
      // Single click (minimal drag distance)
      if (dragDistance < 5 && canPaint) {
        const { x, y } = dragStartRef.current;
        
        // In Paint mode with Brush tool, single click paints the pixel
        // In Hand mode, click opens inspector
        if (mode === 'paint' && interactionMode === 'draw') {
          // Gate behind wallet connection
          if (!requireWallet('paint')) return;
          executeSinglePixelAction(x, y);
          playSound('pixel_select');
        } else if (mode === 'paint') {
          // Hand mode: open inspector
          setInspectedPixel({ x, y });
          playSound('pixel_select');
        }
      }
      
      isDraggingRef.current = false;
      dragStartRef.current = null;
    };

    const handleMapMouseLeave = () => {
      setHoverPixel(null);
      if (isDraggingRef.current) { 
        endSelection(); 
        isDraggingRef.current = false; 
        dragStartRef.current = null; 
      }
      if (isDrawingRef.current) {
        isDrawingRef.current = false;
        stopSpacePaint();
      }
    };

    map.on('mousemove', handleMapMouseMove);
    map.on('mousedown', handleMapMouseDown);
    map.on('mouseup', handleMapMouseUp);
    canvas.addEventListener('mouseleave', handleMapMouseLeave);

    return () => {
      map.off('mousemove', handleMapMouseMove);
      map.off('mousedown', handleMapMouseDown);
      map.off('mouseup', handleMapMouseUp);
      canvas.removeEventListener('mouseleave', handleMapMouseLeave);
    };
  }, [mapReady, mode, selectedColor, interactionMode, isSpaceHeld, isShiftHeld, updateSelection, startSelection, endSelection, clearSelection, isEyedropperActive, handleEyedropperPick, addToQueue, startSpacePaint, stopSpacePaint, canPaint, user, executeSinglePixelAction, playSound, requireWallet]);

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

  const handleClearSelection = useCallback(() => { clearSelection(); clearValidation(); setPendingPixels([]); playSound('pixel_deselect'); }, [clearSelection, clearValidation, playSound]);

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
            <CanvasOverlay map={mapRef.current} pixels={pixels} selection={selection} hoverPixel={hoverPixel} canPaint={canPaint} invalidPixels={invalidPixels} artOpacity={artOpacity} mode={getGameMode(mode)} />
          )}

          {/* HUD Overlay */}
          <HudOverlay>
            <HudSlot position="top-left">
              <GlassPanel padding="none" className="overflow-hidden">
                <SidebarTrigger className="h-9 w-9" />
              </GlassPanel>
            </HudSlot>
            <HudSlot position="top-center">
              <MapToolbar mode={mode} onModeChange={setMode} />
            </HudSlot>
            <HudSlot position="top-right">
              <WalletButton />
            </HudSlot>
            <HudSlot position="bottom-right">
              <ZoomControls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} artOpacity={artOpacity} onToggleArtOpacity={toggleArtOpacity} />
            </HudSlot>
          </HudOverlay>

          {/* Palette Tray - always visible in paint mode */}
          {mode === 'paint' && (
            <PaletteTray
              selectedColor={selectedColor}
              onColorSelect={setSelectedColor}
              viewportPixels={pixels}
              onEyedropperToggle={setIsEyedropperActive}
              isEyedropperActive={isEyedropperActive}
              zoom={zoom}
              interactionMode={interactionMode}
              onInteractionModeChange={setInteractionMode}
            />
          )}

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
      <StatusStrip userId={user?.id} paintQueueSize={queueSize} isSpacePainting={isSpacePainting || isDrawingRef.current} isFlushing={isFlushing} />
      
      {/* Wallet Connect Modal - triggered when trying to paint without connection */}
      <WalletSelectModal
        open={isWalletModalOpen}
        onOpenChange={setWalletModalOpen}
        onSelectPhantom={async () => {
          await connect();
          setWalletModalOpen(false);
        }}
        isConnecting={isConnecting}
      />
    </div>
  );
}
