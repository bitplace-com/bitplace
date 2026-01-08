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
import { MapMenuDrawer } from './MapMenuDrawer';
import { QuickActions } from './QuickActions';
import { WalletButton } from '@/components/wallet/WalletButton';
import { WalletSelectModal } from '@/components/modals/WalletSelectModal';
import { usePixelStore, pixelKey, parsePixelKey } from './hooks/usePixelStore';
import { useSelection } from './hooks/useSelection';
import { useMapState } from './hooks/useMapState';
import { usePaintQueue } from './hooks/usePaintQueue';
import { useDraftPaint } from './hooks/useDraftPaint';
import { useBrushSelection, MAX_BRUSH_SELECTION } from './hooks/useBrushSelection';
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
  const [previewHiddenPixels, setPreviewHiddenPixels] = useState<Set<string>>(new Set());
  const [validatedActionPixels, setValidatedActionPixels] = useState<Set<string> | null>(null);
  
  const { user, refreshUser, connect, isConnecting } = useWallet();
  const { isWalletModalOpen, setWalletModalOpen, requireWallet } = useWalletGate();
  const { getUrlPosition, setUrlPosition } = useMapUrl();
  const { localPixels, paintPixel, mergePixels, confirmPixel } = usePixelStore();
  const { selection, startSelection, updateSelection, endSelection, clearSelection, getNormalizedBounds, getSelectedPixels } = useSelection();
  const { mode, selectedColor, paintTool, zoom, artOpacity, interactionMode, setMode, setSelectedColor, setZoom, toggleArtOpacity, setInteractionMode, canPaint } = useMapState();
  const { dbPixels, updateViewport } = useSupabasePixels(zoom);
  const { validate, commit, validationResult, invalidPixels, isValidating, isCommitting, clearValidation } = useGameActions();
  const { queue: paintQueue, queueSize, isSpacePainting, isFlushing, startSpacePaint, stopSpacePaint, addToQueue, flushQueue } = usePaintQueue(paintPixel, confirmPixel);
  const { draft: draftPixels, draftCount, draftColor, isAtLimit: isDraftAtLimit, draftDirty, addToDraft, removeFromDraft, removeInvalidFromDraft, undoLast: undoDraft, clearDraft, getDraftPixels, setDraftDirty } = useDraftPaint();
  const { brushSelection, selectionCount, isSelectionAtLimit, hasShownLimitToast, startBrushSelection, addToBrushSelection, endBrushSelection, clearBrushSelection, getSelectedPixels: getBrushSelectedPixels, setFromRectSelection } = useBrushSelection();
  const { play: playSound } = useSound();

  // Ref for last drafted pixel to prevent duplicates during hover-paint
  const lastDraftedPixelRef = useRef<{ x: number; y: number } | null>(null);

  const pixels = useMemo(() => mergePixels(dbPixels), [mergePixels, dbPixels]);

  const isDraggingRef = useRef(false);
  const isDrawingRef = useRef(false);
  const isBrushSelectingRef = useRef(false);
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

  // SPACE key handling for hover-paint, SHIFT for selection, ESC to cancel
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC: cancel selection in any mode
      if (e.key === 'Escape') {
        if (pendingPixels.length > 0 || brushSelection.pixels.size > 0 || draftCount > 0) {
          clearSelection();
          clearValidation();
          clearBrushSelection();
          clearDraft();
          setPendingPixels([]);
          setPreviewHiddenPixels(new Set());
          setValidatedActionPixels(null);
          lastDraftedPixelRef.current = null;
          playSound('pixel_deselect');
        }
        return;
      }
      
      // SPACE handling depends on mode
      if (e.code === 'Space' && canPaint && !isSpaceHeld) {
        e.preventDefault();
        
        // In non-PAINT modes OR ERASER tool: SPACE enables brush selection
        const isNonPaintAction = mode !== 'paint' || paintTool === 'ERASER';
        
        if (isNonPaintAction) {
          // Brush selection mode for ERASE/DEFEND/ATTACK/REINFORCE
          if (!requireWallet('interact')) return;
          setIsSpaceHeld(true);
          map.dragPan.disable();
          map.getCanvas().style.cursor = 'crosshair';
          // Start brush selection at current hover
          if (hoverPixel) {
            startBrushSelection(hoverPixel.x, hoverPixel.y);
          }
        } else {
          // PAINT mode with brush: DRAFT mode (no backend calls)
          if (interactionMode !== 'draw') {
            toast.info('Switch to Brush to paint');
            return;
          }
          if (!requireWallet('paint')) return;
          setIsSpaceHeld(true);
          map.dragPan.disable();
          map.getCanvas().style.cursor = 'crosshair';
          // Add first pixel to draft if hovering
          if (hoverPixel && selectedColor !== null) {
            addToDraft(hoverPixel.x, hoverPixel.y, selectedColor);
            lastDraftedPixelRef.current = hoverPixel;
          }
        }
      }
      // SHIFT: enable selection mode
      if (e.key === 'Shift' && !isShiftHeld) {
        setIsShiftHeld(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // SPACE release
      if (e.code === 'Space' && isSpaceHeld) {
        setIsSpaceHeld(false);
        
        // Check if we were in brush selection mode (non-PAINT or ERASER)
        const isNonPaintAction = mode !== 'paint' || paintTool === 'ERASER';
        
        if (isNonPaintAction) {
          // End brush selection and update pendingPixels
          endBrushSelection();
          const selectedPixels = getBrushSelectedPixels();
          if (selectedPixels.length > 0) {
            setPendingPixels(selectedPixels);
            // Clear any previous validation since selection changed
            clearValidation();
            setPreviewHiddenPixels(new Set());
            setValidatedActionPixels(null);
          }
        } else {
          // End PAINT draft mode - no auto-commit, just end the SPACE mode
          // Draft pixels remain and user must validate/confirm
          lastDraftedPixelRef.current = null;
        }
        
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
        // For PAINT mode, don't auto-commit on blur - keep draft
        lastDraftedPixelRef.current = null;
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
  }, [mapReady, mode, canPaint, user, isSpaceHeld, isShiftHeld, interactionMode, selection.isSelecting, endSelection, hoverPixel, selectedColor, addToDraft, requireWallet, pendingPixels.length, clearSelection, clearValidation, playSound, paintTool, brushSelection.pixels.size, startBrushSelection, endBrushSelection, getBrushSelectedPixels, clearBrushSelection, draftCount, clearDraft]);

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

  // Execute single-pixel erase with auto validate+commit
  const executeErase = useCallback(async (x: number, y: number) => {
    if (!requireWallet('erase')) return;
    
    // Validate the erase action
    const result = await validate({ mode: 'ERASE', pixels: [{ x, y }] });
    if (!result?.ok) {
      if (result?.invalidPixels?.length) {
        const reason = result.invalidPixels[0]?.reason;
        if (reason === 'NOT_OWNER') {
          toast.error('You can only erase your own pixels');
        } else if (reason === 'EMPTY_PIXEL') {
          toast.info('This pixel is already empty');
        } else {
          toast.error('Cannot erase this pixel');
        }
      }
      return;
    }
    
    // Commit the erase
    const success = await commit({ 
      mode: 'ERASE', 
      pixels: [{ x, y }], 
      snapshotHash: result.snapshotHash 
    });
    
    if (success) {
      refreshUser();
      playSound('erase_success');
    }
  }, [requireWallet, validate, commit, refreshUser, playSound]);

  const executeSinglePixelAction = useCallback(async (x: number, y: number) => {
    // Eraser mode: open InspectorPanel for validate/confirm flow
    if (paintTool === 'ERASER' || selectedColor === null) {
      if (!requireWallet('erase')) return;
      startSelection(x, y);
      setPendingPixels([{ x, y }]);
      return;
    }
    
    // Auth check for paint
    if (!requireWallet('paint')) return;
    
    const gameMode = getGameMode(mode);
    if (gameMode === 'PAINT') {
      // Use paint queue for consistency with hover-paint
      const queued = addToQueue(x, y, selectedColor);
      if (queued) flushQueue();
      return;
    }
    startSelection(x, y);
    setPendingPixels([{ x, y }]);
  }, [requireWallet, mode, selectedColor, paintTool, addToQueue, flushQueue, getGameMode, startSelection]);

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
        
        // Check if in non-PAINT action mode or ERASER
        const isNonPaintAction = mode !== 'paint' || paintTool === 'ERASER';
        
        // SPACE held in non-PAINT or ERASER mode: brush selection
        if (isSpaceHeld && isNonPaintAction && user) {
          const { atLimit } = addToBrushSelection(pixel.x, pixel.y);
          if (atLimit && !hasShownLimitToast.current) {
            toast.warning(`Selection limit: ${MAX_BRUSH_SELECTION.toLocaleString()} pixels`);
            hasShownLimitToast.current = true;
          }
        }
        // SPACE held in PAINT mode with brush: add to draft (no backend)
        else if (isSpaceHeld && mode === 'paint' && selectedColor !== null && user) {
          const last = lastDraftedPixelRef.current;
          if (!last || last.x !== pixel.x || last.y !== pixel.y) {
            addToDraft(pixel.x, pixel.y, selectedColor);
            lastDraftedPixelRef.current = pixel;
          }
        }
        // Click+drag brush selection (isBrushSelectingRef)
        else if (isBrushSelectingRef.current && isNonPaintAction) {
          const { atLimit } = addToBrushSelection(pixel.x, pixel.y);
          if (atLimit && !hasShownLimitToast.current) {
            toast.warning(`Selection limit: ${MAX_BRUSH_SELECTION.toLocaleString()} pixels`);
            hasShownLimitToast.current = true;
          }
        }
        // SHIFT held or non-PAINT mode dragging: update rect selection
        else if ((isShiftHeld || mode !== 'paint') && isDraggingRef.current && dragStartRef.current) {
          updateSelection(pixel.x, pixel.y);
        }
        // DRAW mode continuous painting - add to draft (no backend)
        else if (interactionMode === 'draw' && isDrawingRef.current && mode === 'paint' && selectedColor !== null && user) {
          addToDraft(pixel.x, pixel.y, selectedColor);
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
      
      // Check if in non-PAINT action mode or ERASER
      const isNonPaintAction = mode !== 'paint' || paintTool === 'ERASER';
      
      // SHIFT held: start rect area selection
      if (isShiftHeld) {
        if (mode !== 'paint' && !requireWallet('interact')) return;
        isDraggingRef.current = true;
        dragStartRef.current = { x: pixel.x, y: pixel.y, screenX: e.point.x, screenY: e.point.y };
        map.dragPan.disable();
        clearValidation();
        setPreviewHiddenPixels(new Set());
        setValidatedActionPixels(null);
        startSelection(pixel.x, pixel.y);
        return;
      }
      
      // Non-PAINT mode (DEFEND/ATTACK/REINFORCE) or ERASER: start brush selection on click+drag
      if (isNonPaintAction && interactionMode === 'draw') {
        if (!requireWallet('interact')) return;
        isBrushSelectingRef.current = true;
        map.dragPan.disable();
        clearValidation();
        setPreviewHiddenPixels(new Set());
        setValidatedActionPixels(null);
        clearBrushSelection();
        startBrushSelection(pixel.x, pixel.y);
        return;
      }
      
      // Non-PAINT mode with DRAG interaction: start rect selection
      if (mode !== 'paint') {
        if (!requireWallet('interact')) return;
        isDraggingRef.current = true;
        dragStartRef.current = { x: pixel.x, y: pixel.y, screenX: e.point.x, screenY: e.point.y };
        map.dragPan.disable();
        clearValidation();
        setPreviewHiddenPixels(new Set());
        setValidatedActionPixels(null);
        startSelection(pixel.x, pixel.y);
        return;
      }
      
      // SPACE held: already in hover-paint or brush selection, ignore mousedown
      if (isSpaceHeld) {
        return;
      }
      
      // DRAW mode in PAINT: start drafting (no backend)
      if (interactionMode === 'draw' && mode === 'paint') {
        // Brush mode: start drafting
        if (!requireWallet('paint')) return;
        isDrawingRef.current = true;
        addToDraft(pixel.x, pixel.y, selectedColor!);
        return;
      }
      
      // DRAG mode: record for click detection
      if (interactionMode === 'drag') {
        isDraggingRef.current = true;
        dragStartRef.current = { x: pixel.x, y: pixel.y, screenX: e.point.x, screenY: e.point.y };
      }
    };

    const handleMapMouseUp = async (e: maplibregl.MapMouseEvent) => {
      // End DRAW mode drafting (no auto-commit for PAINT)
      if (isDrawingRef.current) {
        isDrawingRef.current = false;
        // Draft pixels remain - user must validate/confirm
        return;
      }
      
      // End brush selection (click+drag in action modes)
      if (isBrushSelectingRef.current) {
        isBrushSelectingRef.current = false;
        endBrushSelection();
        const selectedPixels = getBrushSelectedPixels();
        if (selectedPixels.length > 0) {
          setPendingPixels(selectedPixels);
          playSound('pixel_select');
        }
        map.dragPan.enable();
        return;
      }
      
      // End SHIFT area selection or non-PAINT mode rect selection
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
        // In Hand mode, click opens inspector (or select for erase if eraser active)
        if (mode === 'paint' && interactionMode === 'draw') {
          // Gate behind wallet connection
          const action = (paintTool === 'ERASER' || selectedColor === null) ? 'erase' : 'paint';
          if (!requireWallet(action)) return;
          executeSinglePixelAction(x, y);
          playSound('pixel_select');
        } else if (mode === 'paint') {
          // Hand mode: if eraser is active, select for erase action
          if (paintTool === 'ERASER' || selectedColor === null) {
            if (!requireWallet('erase')) return;
            startSelection(x, y);
            setPendingPixels([{ x, y }]);
            playSound('pixel_select');
          } else {
            // Normal hand mode: open inspector
            setInspectedPixel({ x, y });
            playSound('pixel_select');
          }
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
        // Draft pixels remain - no auto-commit
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
  }, [mapReady, mode, selectedColor, interactionMode, isSpaceHeld, isShiftHeld, updateSelection, startSelection, endSelection, clearSelection, isEyedropperActive, handleEyedropperPick, addToDraft, canPaint, user, executeSinglePixelAction, playSound, requireWallet]);

  const handleZoomIn = useCallback(() => mapRef.current?.zoomIn(), []);
  const handleZoomOut = useCallback(() => mapRef.current?.zoomOut(), []);

  const handleValidate = useCallback(async () => {
    if (!user) { toast.error('Please connect wallet first'); return; }
    // Check if eraser is active (selectedColor === null) in paint mode
    const isEraseAction = mode === 'paint' && selectedColor === null;
    const gameMode = isEraseAction ? 'ERASE' : getGameMode(mode);
    await validate({ mode: gameMode as GameMode, pixels: pendingPixels, color: gameMode === 'PAINT' ? selectedColor : undefined, pePerPixel: gameMode !== 'PAINT' && gameMode !== 'ERASE' ? pePerPixel : undefined });
  }, [user, mode, pendingPixels, selectedColor, pePerPixel, validate, getGameMode]);

  const handleClearSelection = useCallback(() => { clearSelection(); clearValidation(); setPendingPixels([]); playSound('pixel_deselect'); }, [clearSelection, clearValidation, playSound]);

  const handleConfirm = useCallback(async () => {
    // Check if eraser is active (selectedColor === null) in paint mode
    const isEraseAction = mode === 'paint' && selectedColor === null;
    const gameMode = isEraseAction ? 'ERASE' : getGameMode(mode);
    
    if (!validationResult?.ok) {
      if (gameMode === 'PAINT') {
        const result = await validate({ mode: 'PAINT', pixels: pendingPixels, color: selectedColor });
        if (!result?.ok) return;
        const success = await commit({ mode: 'PAINT', pixels: pendingPixels, color: selectedColor, snapshotHash: result.snapshotHash });
        if (success) { 
          pendingPixels.forEach(({ x, y }) => { paintPixel(x, y, selectedColor); confirmPixel(x, y); }); 
          refreshUser(); 
          handleClearSelection();
          playSound('paint_commit');
        }
      } else if (gameMode === 'ERASE') {
        const result = await validate({ mode: 'ERASE', pixels: pendingPixels });
        if (!result?.ok) return;
        const success = await commit({ mode: 'ERASE', pixels: pendingPixels, snapshotHash: result.snapshotHash });
        if (success) { 
          refreshUser(); 
          handleClearSelection();
          playSound('erase_success');
        }
      }
      return;
    }
    const success = await commit({ mode: gameMode as GameMode, pixels: pendingPixels, color: gameMode === 'PAINT' ? selectedColor : undefined, pePerPixel: gameMode !== 'PAINT' && gameMode !== 'ERASE' ? pePerPixel : undefined, snapshotHash: validationResult.snapshotHash });
    if (success) {
      if (gameMode === 'PAINT') {
        pendingPixels.forEach(({ x, y }) => { paintPixel(x, y, selectedColor); confirmPixel(x, y); });
        playSound('paint_commit');
      } else if (gameMode === 'ERASE') {
        playSound('erase_success');
      } else if (gameMode === 'DEFEND') {
        playSound('defend_success');
      } else if (gameMode === 'ATTACK') {
        playSound('attack_success');
      } else if (gameMode === 'REINFORCE') {
        playSound('reinforce_success');
      }
      refreshUser(); 
      handleClearSelection();
    }
  }, [validationResult, mode, pendingPixels, selectedColor, pePerPixel, commit, validate, getGameMode, paintPixel, confirmPixel, refreshUser, handleClearSelection, playSound]);

  // Inspector card handlers
  const handleInspectorPaint = useCallback(async (x: number, y: number) => {
    await executeSinglePixelAction(x, y);
  }, [executeSinglePixelAction]);

  const handleInspectorDefendAttack = useCallback((x: number, y: number, targetMode: 'DEFEND' | 'ATTACK') => {
    setMode(targetMode.toLowerCase() as 'paint' | 'defend' | 'attack');
    startSelection(x, y);
    setPendingPixels([{ x, y }]);
  }, [setMode, startSelection]);

  const handleInspectorErase = useCallback((x: number, y: number) => {
    // Close inspector and open InspectorPanel with ERASE mode
    setInspectedPixel(null);
    setSelectedColor(null); // This sets paintTool to ERASER
    startSelection(x, y);
    setPendingPixels([{ x, y }]);
  }, [startSelection, setSelectedColor]);

  const handleCloseInspector = useCallback(() => {
    setInspectedPixel(null);
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col">
      <div className="flex-1 relative overflow-hidden">
        <div ref={containerRef} className="absolute inset-0" />

        {mapReady && (
          <CanvasOverlay 
            map={mapRef.current} 
            pixels={pixels} 
            selection={selection} 
            hoverPixel={hoverPixel} 
            canPaint={canPaint} 
            invalidPixels={invalidPixels} 
            artOpacity={artOpacity} 
            mode={(mode === 'paint' && selectedColor === null) ? 'ERASE' : getGameMode(mode)}
            brushSelectionPixels={brushSelection.pixels}
            previewHiddenPixels={previewHiddenPixels}
            draftPixels={draftCount > 0 ? new Map(Array.from(draftPixels.entries()).map(([k, v]) => [k, { color: v.color }])) : undefined}
          />
        )}

        {/* HUD Overlay */}
        <HudOverlay>
          <HudSlot position="top-left">
            <div className="flex flex-col gap-2">
              <MapMenuDrawer />
              <QuickActions />
            </div>
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
          onErase={handleInspectorErase}
          selectedColor={selectedColor}
          mode={paintTool === 'ERASER' ? 'ERASE' : getGameMode(mode)}
          currentUserId={user?.id}
        />

        {/* Inspector Panel for draft or pending pixels */}
        {canPaint && (pendingPixels.length > 0 || draftCount > 0) && (
          <div className="absolute right-0 top-0 h-full z-20 pointer-events-none">
            <div className="pointer-events-auto h-full">
              <InspectorPanel 
                selectedPixels={draftCount > 0 ? getDraftPixels() : pendingPixels} 
                mode={(mode === 'paint' && selectedColor === null) ? 'ERASE' : getGameMode(mode)} 
                selectedColor={draftCount > 0 ? draftColor : selectedColor} 
                currentUserId={user?.id} 
                validationResult={validationResult} 
                invalidPixels={invalidPixels} 
                pePerPixel={pePerPixel} 
                onPePerPixelChange={setPePerPixel} 
                onColorSelect={setSelectedColor} 
                onValidate={handleValidate} 
                onConfirm={handleConfirm} 
                onClearSelection={draftCount > 0 ? clearDraft : handleClearSelection} 
                isValidating={isValidating} 
                isCommitting={isCommitting}
                isDraftMode={draftCount > 0}
                draftCount={draftCount}
                onUndoDraft={undoDraft}
                onClearDraft={clearDraft}
              />
            </div>
          </div>
        )}
      </div>
      <StatusStrip userId={user?.id} paintQueueSize={queueSize} isSpacePainting={isSpacePainting || isDrawingRef.current} isFlushing={isFlushing} draftCount={draftCount} />
      
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
