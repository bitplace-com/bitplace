import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import { CanvasOverlay } from './CanvasOverlay';
import { MapToolbar } from './MapToolbar';
import { ZoomControls } from './ZoomControls';
import { InspectorPanel } from './inspector';
import { InspectSelectionPanel } from './inspector/InspectSelectionPanel';
import { StatusStrip } from './StatusStrip';
import { HudOverlay, HudSlot } from './HudOverlay';
import { PixelInspectorDrawer } from './PixelInspectorDrawer';
import { ActionTray } from './ActionTray';
import { MapMenuDrawer } from './MapMenuDrawer';
import { QuickActions } from './QuickActions';
import { PerfHud } from './PerfHud';
import { WalletButton } from '@/components/wallet/WalletButton';
import { WalletSelectModal } from '@/components/modals/WalletSelectModal';
import { usePixelStore, pixelKey, parsePixelKey } from './hooks/usePixelStore';
import { useSelection } from './hooks/useSelection';
import { useMapState } from './hooks/useMapState';
import { usePaintQueue } from './hooks/usePaintQueue';
import { useDraftPaint } from './hooks/useDraftPaint';
import { useBrushSelection, MAX_BRUSH_SELECTION } from './hooks/useBrushSelection';
import { usePointerInteraction, type PointerInputType } from './hooks/usePointerInteraction';
import { useSupabasePixels } from '@/hooks/useSupabasePixels';
import { useGameActions, type GameMode } from '@/hooks/useGameActions';
import { useWallet } from '@/contexts/WalletContext';
import { useWalletGate } from '@/hooks/useWalletGate';
import { useMapUrl } from '@/hooks/useMapUrl';
import { useSound } from '@/hooks/useSound';
import { usePeBalance } from '@/hooks/usePeBalance';
import { lngLatToGridInt, getViewportGridBounds, Z_SHOW_PAINTS } from '@/lib/pixelGrid';
import { haptic } from '@/lib/haptics';
import { markMapMountStart } from '@/lib/perfMetrics';

// Helper to get snapped 2x2 block coordinates
const getSnapped2x2Block = (x: number, y: number): { x: number; y: number }[] => {
  const topLeftX = x - (x % 2);
  const topLeftY = y - (y % 2);
  return [
    { x: topLeftX, y: topLeftY },
    { x: topLeftX + 1, y: topLeftY },
    { x: topLeftX, y: topLeftY + 1 },
    { x: topLeftX + 1, y: topLeftY + 1 },
  ];
};

export function BitplaceMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const interactionLayerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [hoverPixel, setHoverPixel] = useState<{ x: number; y: number } | null>(null);
  const [inspectedPixel, setInspectedPixel] = useState<{ x: number; y: number } | null>(null);
  const [isEyedropperActive, setIsEyedropperActive] = useState(false);
  const [isSpaceHeld, setIsSpaceHeld] = useState(false);
  const [isShiftHeld, setIsShiftHeld] = useState(false);
  const isTouchPaintingRef = useRef(false);
  const lastPaintedPixelRef = useRef<{ x: number; y: number } | null>(null);
  
  const [pendingPixels, setPendingPixels] = useState<{ x: number; y: number }[]>([]);
  const [inspectSelection, setInspectSelection] = useState<{ x: number; y: number }[]>([]);
  const [pePerPixel, setPePerPixel] = useState(1);
  const [previewHiddenPixels, setPreviewHiddenPixels] = useState<Set<string>>(new Set());
  const [validatedActionPixels, setValidatedActionPixels] = useState<Set<string> | null>(null);
  
  const { user, refreshUser, connect, isConnecting } = useWallet();
  const { isWalletModalOpen, setWalletModalOpen, requireWallet } = useWalletGate();
  const { getUrlPosition, setUrlPosition } = useMapUrl();
  const { localPixels, paintPixel, mergePixels, confirmPixel } = usePixelStore();
  const { selection, startSelection, updateSelection, endSelection, clearSelection, getNormalizedBounds, getSelectedPixels } = useSelection();
  const { mode, selectedColor, paintTool, brushSize, zoom, artOpacity, interactionMode, setMode, setSelectedColor, setZoom, toggleArtOpacity, setInteractionMode, setPaintTool, setBrushSize, canPaint } = useMapState();
  const { dbPixels, updateViewport, removePixels, addPixels } = useSupabasePixels(zoom);
  const { validate, commit, validationResult, invalidPixels, isValidating, isCommitting, clearValidation } = useGameActions();
  const { queue: paintQueue, queueSize, isSpacePainting, isFlushing, startSpacePaint, stopSpacePaint, addToQueue, flushQueue } = usePaintQueue(paintPixel, confirmPixel);
  const { draft: draftPixels, draftCount, draftColor, isAtLimit: isDraftAtLimit, draftDirty, addToDraft, removeFromDraft, removeInvalidFromDraft, undoLast: undoDraft, clearDraft, getDraftPixels, setDraftDirty } = useDraftPaint();
  const { brushSelection, selectionCount, isSelectionAtLimit, hasShownLimitToast, startBrushSelection, addToBrushSelection, endBrushSelection, clearBrushSelection, getSelectedPixels: getBrushSelectedPixels, setFromRectSelection } = useBrushSelection();
  const { 
    brushSelection: inspectBrushSelection, 
    hasShownLimitToast: hasShownInspectLimitToast,
    startBrushSelection: startInspectBrushSelection, 
    addToBrushSelection: addToInspectBrushSelection, 
    endBrushSelection: endInspectBrushSelection, 
    clearBrushSelection: clearInspectBrushSelection, 
    getSelectedPixels: getInspectSelectedPixels 
  } = useBrushSelection();
  const { play: playSound } = useSound();
  const peBalance = usePeBalance(user?.id);

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

  // Touch/Pointer handling callbacks for mobile support
  const handleTouchPaintStart = useCallback((x: number, y: number) => {
    if (!requireWallet('paint')) return;
    
    // Paint with brush
    if (mode === 'paint' && paintTool === 'BRUSH' && selectedColor !== null) {
      if (brushSize === '2x2') {
        const block = getSnapped2x2Block(x, y);
        block.forEach(p => addToDraft(p.x, p.y, selectedColor));
        lastDraftedPixelRef.current = block[0];
      } else {
        addToDraft(x, y, selectedColor);
        lastDraftedPixelRef.current = { x, y };
      }
      isTouchPaintingRef.current = true;
      playSound('pixel_select');
      haptic('light'); // Haptic feedback for paint
    }
    // Eraser
    else if (paintTool === 'ERASER') {
      const draftKey = `${x}:${y}`;
      if (draftPixels.has(draftKey)) {
        removeFromDraft(x, y);
        playSound('pixel_deselect');
        haptic('light'); // Haptic feedback for erase
      } else {
        startBrushSelection(x, y);
        haptic('medium'); // Haptic feedback for selection
      }
      isTouchPaintingRef.current = true;
    }
    // Action modes (DEFEND/ATTACK/REINFORCE)
    else if (['defend', 'attack', 'reinforce'].includes(mode)) {
      if (!requireWallet('interact')) return;
      startBrushSelection(x, y);
      isTouchPaintingRef.current = true;
      haptic('medium'); // Haptic feedback for action selection
    }
  }, [mode, paintTool, selectedColor, brushSize, addToDraft, removeFromDraft, startBrushSelection, draftPixels, requireWallet, playSound]);

  const handleTouchPaintMove = useCallback((x: number, y: number) => {
    // Paint with brush (continuous)
    if (mode === 'paint' && paintTool === 'BRUSH' && selectedColor !== null) {
      const last = lastDraftedPixelRef.current;
      if (brushSize === '2x2') {
        const block = getSnapped2x2Block(x, y);
        const topLeft = block[0];
        if (!last || last.x !== topLeft.x || last.y !== topLeft.y) {
          block.forEach(p => addToDraft(p.x, p.y, selectedColor));
          lastDraftedPixelRef.current = topLeft;
          haptic('light'); // Light haptic for each new pixel
        }
      } else {
        if (!last || last.x !== x || last.y !== y) {
          addToDraft(x, y, selectedColor);
          lastDraftedPixelRef.current = { x, y };
          haptic('light'); // Light haptic for each new pixel
        }
      }
    }
    // Eraser (continuous)
    else if (paintTool === 'ERASER') {
      const draftKey = `${x}:${y}`;
      if (draftPixels.has(draftKey)) {
        removeFromDraft(x, y);
        haptic('light');
      } else {
        addToBrushSelection(x, y);
      }
    }
    // Action modes (continuous selection)
    else if (['defend', 'attack', 'reinforce'].includes(mode)) {
      addToBrushSelection(x, y);
    }
  }, [mode, paintTool, selectedColor, brushSize, addToDraft, removeFromDraft, addToBrushSelection, draftPixels]);

  const handleTouchPaintEnd = useCallback((x: number, y: number, wasTap: boolean) => {
    isTouchPaintingRef.current = false;
    lastDraftedPixelRef.current = null;
    
    // End brush selection for eraser/action modes
    if (paintTool === 'ERASER' || ['defend', 'attack', 'reinforce'].includes(mode)) {
      endBrushSelection();
      const selectedPixels = getBrushSelectedPixels();
      
      if (paintTool === 'ERASER' && selectedPixels.length > 0) {
        // Separate draft and committed pixels
        const committedPixels: { x: number; y: number }[] = [];
        selectedPixels.forEach(({ x, y }) => {
          const key = `${x}:${y}`;
          if (!draftPixels.has(key)) {
            committedPixels.push({ x, y });
          }
        });
        if (committedPixels.length > 0) {
          setPendingPixels(committedPixels);
          clearValidation();
        }
        clearBrushSelection();
      } else if (selectedPixels.length > 0) {
        // Action modes
        setPendingPixels(selectedPixels);
        clearValidation();
        setPreviewHiddenPixels(new Set());
        setValidatedActionPixels(null);
      }
    }
  }, [mode, paintTool, endBrushSelection, getBrushSelectedPixels, clearBrushSelection, draftPixels, clearValidation]);

  const handleTouchTapInspect = useCallback((x: number, y: number) => {
    // In HAND mode, tap opens pixel inspector
    setInspectedPixel({ x, y });
    playSound('pixel_select');
  }, [playSound]);

  // Integrate pointer interaction hook for touch/pen support
  usePointerInteraction(
    interactionLayerRef,
    mapRef.current,
    {
      enabled: mapReady && canPaint,
      isHandMode: interactionMode === 'drag',
      callbacks: {
        onPointerStart: (x, y, type) => {
          if (interactionMode === 'drag') return; // Let map handle in HAND mode
          handleTouchPaintStart(x, y);
        },
        onPointerMove: (x, y, type) => {
          if (interactionMode === 'drag') return;
          if (isTouchPaintingRef.current) {
            handleTouchPaintMove(x, y);
          }
        },
        onPointerEnd: (x, y, type, wasTap) => {
          if (interactionMode === 'drag') {
            if (wasTap) handleTouchTapInspect(x, y);
            return;
          }
          handleTouchPaintEnd(x, y, wasTap);
        },
      },
    }
  );

  // Track URL pixel to open on load
  const urlPixelRef = useRef<{ x: number; y: number } | null>(null);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    
    // Mark perf timing for TTFP measurement
    markMapMountStart();
    
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

  // Listen for navigation events from SearchModal and StatusAlerts
  useEffect(() => {
    const handleNavigate = (e: Event) => {
      const detail = (e as CustomEvent<{ lat: number; lng: number; zoom?: number; pixelX?: number; pixelY?: number }>).detail;
      if (!mapRef.current || !detail) return;
      
      const { lat, lng, zoom: targetZoom, pixelX, pixelY } = detail;
      const finalZoom = targetZoom || Math.max(8, mapRef.current.getZoom());
      
      mapRef.current.flyTo({ 
        center: [lng, lat], 
        zoom: finalZoom,
        duration: 2000,
      });
      
      // Update URL
      setUrlPosition(lat, lng, finalZoom);
      
      // Open inspector after flyTo if pixel coords provided
      if (pixelX !== undefined && pixelY !== undefined) {
        setTimeout(() => {
          setInspectedPixel({ x: pixelX, y: pixelY });
        }, 2100); // After flyTo animation completes
      }
    };

    // Listen for direct inspect events (from StatusAlerts jump)
    const handleInspect = (e: Event) => {
      const detail = (e as CustomEvent<{ x: number; y: number }>).detail;
      if (detail) {
        setInspectedPixel({ x: detail.x, y: detail.y });
      }
    };

    window.addEventListener('bitplace:navigate', handleNavigate);
    window.addEventListener('bitplace:inspect', handleInspect);
    return () => {
      window.removeEventListener('bitplace:navigate', handleNavigate);
      window.removeEventListener('bitplace:inspect', handleInspect);
    };
  }, [setUrlPosition]);

  // SPACE key handling for hover-paint, SHIFT for selection, ESC to cancel
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC: clear ONLY actionSelection + validation, NEVER paintDraft
      if (e.key === 'Escape') {
        // Only clear action selection (pendingPixels, brushSelection) - NOT draft
        if (pendingPixels.length > 0 || brushSelection.pixels.size > 0) {
          clearSelection();
          clearValidation();
          clearBrushSelection();
          setPendingPixels([]);
          setPreviewHiddenPixels(new Set());
          setValidatedActionPixels(null);
          playSound('pixel_deselect');
        }
        // paintDraft is NOT cleared by ESC - user has explicit Undo/Clear buttons
        return;
      }
      
      // SPACE handling depends on mode AND context
      if (e.code === 'Space' && canPaint && !isSpaceHeld) {
        e.preventDefault();
        
        // NEW: SPACE in HAND mode enables inspect-multi-select
        if (interactionMode === 'drag') {
          setIsSpaceHeld(true);
          map.dragPan.disable();
          map.getCanvas().style.cursor = 'crosshair';
          // Start inspect brush selection at current hover
          if (hoverPixel) {
            startInspectBrushSelection(hoverPixel.x, hoverPixel.y);
          }
          return;
        }
        
        // Below: DRAW mode only
        // In non-PAINT modes OR ERASER tool: SPACE enables brush selection
        const isNonPaintAction = mode !== 'paint' || paintTool === 'ERASER';
        
        if (isNonPaintAction) {
          // Brush selection mode for ERASE/DEFEND/ATTACK/REINFORCE
          if (!requireWallet('interact')) return;
          setIsSpaceHeld(true);
          map.dragPan.disable();
          map.getCanvas().style.cursor = 'crosshair';
          // Start brush selection at current hover - but check for draft pixels first
          if (hoverPixel) {
            // ERASER: if hovering over draft pixel, erase it immediately, don't start selection
            if (paintTool === 'ERASER') {
              const draftKey = `${hoverPixel.x}:${hoverPixel.y}`;
              if (draftPixels.has(draftKey)) {
                removeFromDraft(hoverPixel.x, hoverPixel.y);
                playSound('pixel_deselect');
                // Don't start brush selection for draft pixels
                return;
              }
            }
            startBrushSelection(hoverPixel.x, hoverPixel.y);
          }
        } else {
          // PAINT mode with brush: DRAFT mode (no backend calls)
          if (!requireWallet('paint')) return;
          setIsSpaceHeld(true);
          map.dragPan.disable();
          map.getCanvas().style.cursor = 'crosshair';
          // Add first pixel(s) to draft if hovering
          if (hoverPixel && selectedColor !== null) {
            if (brushSize === '2x2') {
              const block = getSnapped2x2Block(hoverPixel.x, hoverPixel.y);
              block.forEach(p => addToDraft(p.x, p.y, selectedColor));
              lastDraftedPixelRef.current = block[0];
            } else {
              addToDraft(hoverPixel.x, hoverPixel.y, selectedColor);
              lastDraftedPixelRef.current = hoverPixel;
            }
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
        
        // HAND MODE: End inspect selection, keep selection active
        if (interactionMode === 'drag') {
          endInspectBrushSelection();
          const selectedPixels = getInspectSelectedPixels();
          if (selectedPixels.length > 0) {
            setInspectSelection(selectedPixels);
          }
          map.dragPan.enable();
          map.getCanvas().style.cursor = '';
          return;
        }
        
        // DRAW MODE: Check if we were in brush selection mode (non-PAINT or ERASER)
        const isNonPaintAction = mode !== 'paint' || paintTool === 'ERASER';
        
        if (isNonPaintAction) {
          // End brush selection and update pendingPixels
          endBrushSelection();
          const selectedPixels = getBrushSelectedPixels();
          
          // ERASER mode: Auto-remove draft pixels immediately on SPACE release
          if (paintTool === 'ERASER' && selectedPixels.length > 0) {
            let removedCount = 0;
            const committedPixels: { x: number; y: number }[] = [];
            
            selectedPixels.forEach(({ x, y }) => {
              const key = `${x}:${y}`;
              if (draftPixels.has(key)) {
                // Pixel is in draft → remove immediately
                removeFromDraft(x, y);
                removedCount++;
              } else {
                // Pixel is committed → add to pending for validate flow
                committedPixels.push({ x, y });
              }
            });
            
            // Only committed pixels go to validate flow
            if (committedPixels.length > 0) {
              setPendingPixels(committedPixels);
              clearValidation();
              setPreviewHiddenPixels(new Set());
              setValidatedActionPixels(null);
            } else {
              // All were draft pixels, clear selection
              clearBrushSelection();
            }
            
            // Sound feedback if draft pixels were removed
            if (removedCount > 0) {
              playSound('pixel_deselect');
            }
          } else if (selectedPixels.length > 0) {
            // Non-ERASER actions (DEFEND, ATTACK, etc.)
            setPendingPixels(selectedPixels);
            clearValidation();
            setPreviewHiddenPixels(new Set());
            setValidatedActionPixels(null);
          }
        } else {
          // End PAINT draft mode - no auto-commit, just end the SPACE mode
          // Draft pixels remain and user must validate/confirm
          lastDraftedPixelRef.current = null;
        }
        
        // Cursor back to default for draw mode
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
  }, [mapReady, mode, canPaint, user, isSpaceHeld, isShiftHeld, interactionMode, selection.isSelecting, endSelection, hoverPixel, selectedColor, addToDraft, requireWallet, pendingPixels.length, clearSelection, clearValidation, playSound, paintTool, brushSize, brushSelection.pixels.size, startBrushSelection, endBrushSelection, getBrushSelectedPixels, clearBrushSelection, draftPixels, removeFromDraft]);

  // Auto-clear actionSelection when tool or mode changes (but keep paintDraft)
  const prevModeRef = useRef(mode);
  const prevPaintToolRef = useRef(paintTool);
  const prevInteractionModeRef = useRef(interactionMode);
  
  useEffect(() => {
    const modeChanged = prevModeRef.current !== mode;
    const toolChanged = prevPaintToolRef.current !== paintTool;
    const interactionChanged = prevInteractionModeRef.current !== interactionMode;
    
    // Update refs
    prevModeRef.current = mode;
    prevPaintToolRef.current = paintTool;
    prevInteractionModeRef.current = interactionMode;
    
    // Clear action selection on any tool/mode change
    if (modeChanged || toolChanged || interactionChanged) {
      clearBrushSelection();
      setPendingPixels([]);
      clearValidation();
      setPreviewHiddenPixels(new Set());
      setValidatedActionPixels(null);
      // Also close inspect selection when switching to HAND
      if (interactionChanged && interactionMode === 'drag') {
        setInspectSelection([]);
        clearInspectBrushSelection();
      }
      // NOTE: paintDraft is NOT cleared - it persists across tool/mode changes
    }
  }, [mode, paintTool, interactionMode, clearBrushSelection, clearValidation, clearInspectBrushSelection]);

  // Update dragPan when interaction mode changes
  // Always enable drag when can't paint, regardless of interactionMode
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    // When zoomed out past interaction threshold, always enable drag
    if (!canPaint) {
      map.dragPan.enable();
      map.getCanvas().style.cursor = '';
      return;
    }

    if (interactionMode === 'drag') {
      map.dragPan.enable();
      map.getCanvas().style.cursor = '';
    } else {
      map.dragPan.disable();
      map.getCanvas().style.cursor = 'crosshair';
    }
  }, [mapReady, interactionMode, canPaint]);

  useEffect(() => {
    const selectedPixels = getSelectedPixels();
    if (selectedPixels.length > 0) setPendingPixels(selectedPixels);
  }, [selection.bounds, getSelectedPixels]);

  // Track when validation just completed to prevent immediate auto-invalidation
  const lastValidationTimeRef = useRef<number>(0);
  
  // Auto-invalidate validation when draft changes (state machine: DRAFT state resets VALIDATED_READY)
  // But add debounce to prevent clearing validation immediately after it's set
  useEffect(() => {
    if (draftDirty && validationResult) {
      const timeSinceValidation = Date.now() - lastValidationTimeRef.current;
      // Only auto-invalidate if validation was set more than 200ms ago
      if (timeSinceValidation > 200) {
        clearValidation();
        setDraftDirty(false);
      }
    }
  }, [draftDirty, validationResult, clearValidation, setDraftDirty]);

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
        
        // HAND MODE with SPACE: inspect multi-select
        if (interactionMode === 'drag') {
          if (isSpaceHeld && user) {
            const { atLimit } = addToInspectBrushSelection(pixel.x, pixel.y);
            if (atLimit && !hasShownInspectLimitToast.current) {
              toast.warning(`Selection limit: ${MAX_BRUSH_SELECTION.toLocaleString()} pixels`);
              hasShownInspectLimitToast.current = true;
            }
          }
          return;
        }
        
        // Check if in non-PAINT action mode or ERASER
        const isNonPaintAction = mode !== 'paint' || paintTool === 'ERASER';
        
        // ERASER tool with SPACE: check if hovering over draft pixels first
        if (isSpaceHeld && paintTool === 'ERASER' && user) {
          const draftKey = `${pixel.x}:${pixel.y}`;
          // If pixel is in draft, remove it immediately (realtime draft erase)
          if (draftPixels.has(draftKey)) {
            removeFromDraft(pixel.x, pixel.y);
            playSound('pixel_deselect');
            return;
          }
          // Otherwise add to brush selection for committed pixels (validate flow)
          const { atLimit } = addToBrushSelection(pixel.x, pixel.y);
          if (atLimit && !hasShownLimitToast.current) {
            toast.warning(`Selection limit: ${MAX_BRUSH_SELECTION.toLocaleString()} pixels`);
            hasShownLimitToast.current = true;
          }
        }
        // SPACE held in non-PAINT mode (not ERASER): brush selection
        else if (isSpaceHeld && isNonPaintAction && paintTool !== 'ERASER' && user) {
          const { atLimit } = addToBrushSelection(pixel.x, pixel.y);
          if (atLimit && !hasShownLimitToast.current) {
            toast.warning(`Selection limit: ${MAX_BRUSH_SELECTION.toLocaleString()} pixels`);
            hasShownLimitToast.current = true;
          }
        }
        // SPACE held in PAINT mode with brush: add to draft (no backend)
        else if (isSpaceHeld && mode === 'paint' && selectedColor !== null && user) {
          const last = lastDraftedPixelRef.current;
          // For 2x2 brush, snap to block
          if (brushSize === '2x2') {
            const block = getSnapped2x2Block(pixel.x, pixel.y);
            const topLeft = block[0];
            if (!last || last.x !== topLeft.x || last.y !== topLeft.y) {
              block.forEach(p => addToDraft(p.x, p.y, selectedColor));
              lastDraftedPixelRef.current = topLeft;
            }
          } else {
            if (!last || last.x !== pixel.x || last.y !== pixel.y) {
              addToDraft(pixel.x, pixel.y, selectedColor);
              lastDraftedPixelRef.current = pixel;
            }
          }
        }
        // Click+drag brush selection (isBrushSelectingRef) - REMOVED per PROMPT 61
        // Mouse-hold multi-selection is disabled; use SPACE-only continuous selection
        
        // SHIFT held rect selection (allowed even in HAND mode for rect select)
        else if (isShiftHeld && isDraggingRef.current && dragStartRef.current) {
          updateSelection(pixel.x, pixel.y);
        }
        // NOTE: Mouse-hold drawing removed - draft mode only via SPACE key
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
      
      // SHIFT held: start rect area selection (allowed in both HAND and DRAW modes)
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
      
      // CRITICAL: HAND MODE - only record for click detection (opens inspector)
      // DO NOT start any selection or painting in HAND mode
      if (interactionMode === 'drag') {
        isDraggingRef.current = true;
        dragStartRef.current = { x: pixel.x, y: pixel.y, screenX: e.point.x, screenY: e.point.y };
        // Map panning is already enabled in DRAG mode, no need to disable
        return;
      }
      
      // Below this point: DRAW mode only
      
      // Non-PAINT mode (DEFEND/ATTACK/REINFORCE) or ERASER: record start for single-click detection only
      // Mouse-hold multi-selection is disabled per PROMPT 61 (use SPACE for continuous selection)
      if (isNonPaintAction) {
        if (!requireWallet('interact')) return;
        isDraggingRef.current = true;
        dragStartRef.current = { x: pixel.x, y: pixel.y, screenX: e.point.x, screenY: e.point.y };
        map.dragPan.disable();
        // Clear any previous validation/selection
        clearValidation();
        setPreviewHiddenPixels(new Set());
        setValidatedActionPixels(null);
        return;
      }
      
      // SPACE held: already in hover-paint or brush selection, ignore mousedown
      if (isSpaceHeld) {
        return;
      }
      
      // DRAW mode in PAINT: single-click adds one pixel (no mouse-hold continuous)
      if (mode === 'paint') {
        if (!requireWallet('paint')) return;
        isDraggingRef.current = true;
        dragStartRef.current = { x: pixel.x, y: pixel.y, screenX: e.point.x, screenY: e.point.y };
        return;
      }
    };

    const handleMapMouseUp = async (e: maplibregl.MapMouseEvent) => {
      // End brush selection (click+drag in action modes) - now single-click only
      if (isBrushSelectingRef.current) {
        isBrushSelectingRef.current = false;
        map.dragPan.enable();
        return;
      }
      
      // End SHIFT area selection or non-PAINT mode rect selection
      if ((isShiftHeld || mode !== 'paint') && isDraggingRef.current) {
        const dragDistance = dragStartRef.current ? Math.sqrt(
          Math.pow(e.point.x - dragStartRef.current.screenX, 2) + 
          Math.pow(e.point.y - dragStartRef.current.screenY, 2)
        ) : 0;
        
        // If it was a SHIFT rect selection, handle it
        if (isShiftHeld && selection.isSelecting) {
          endSelection();
          // If rect selection had an area, the pixels come from getSelectedPixels
        } else if (mode !== 'paint' && dragDistance < 5 && dragStartRef.current) {
          // Single click in non-PAINT mode - select single pixel for action
          const { x, y } = dragStartRef.current;
          setPendingPixels([{ x, y }]);
          playSound('pixel_select');
        }
        
        isDraggingRef.current = false;
        dragStartRef.current = null;
        map.dragPan.enable();
        return;
      }
      
      // Handle click (minimal drag distance)
      if (!isDraggingRef.current || !dragStartRef.current) return;
      
      const dragDistance = Math.sqrt(
        Math.pow(e.point.x - dragStartRef.current.screenX, 2) + 
        Math.pow(e.point.y - dragStartRef.current.screenY, 2)
      );
      
      // Single click (minimal drag distance)
      if (dragDistance < 5 && canPaint) {
        const { x, y } = dragStartRef.current;
        
        // HAND MODE: Always open inspector only - NO action selection, NO eraser exception
        if (interactionMode === 'drag') {
          setInspectedPixel({ x, y });
          playSound('pixel_select');
        }
        // DRAW mode in PAINT: single click adds single pixel to draft
        else if (mode === 'paint' && interactionMode === 'draw') {
          const action = (paintTool === 'ERASER' || selectedColor === null) ? 'erase' : 'paint';
          if (!requireWallet(action)) {
            isDraggingRef.current = false;
            dragStartRef.current = null;
            return;
          }
          
          if (action === 'erase') {
            const draftKey = `${x}:${y}`;
            // Single click on draft pixel: remove from draft immediately, no selection
            if (draftPixels.has(draftKey)) {
              removeFromDraft(x, y);
              playSound('pixel_deselect');
            } else {
              // Committed pixel: select for validate/confirm flow
              startSelection(x, y);
              setPendingPixels([{ x, y }]);
            }
          } else {
            // Paint: add single pixel to draft
            if (brushSize === '2x2') {
              const block = getSnapped2x2Block(x, y);
              block.forEach(p => addToDraft(p.x, p.y, selectedColor!));
            } else {
              addToDraft(x, y, selectedColor!);
            }
          }
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
  }, [mapReady, mode, selectedColor, interactionMode, isSpaceHeld, isShiftHeld, updateSelection, startSelection, endSelection, clearSelection, isEyedropperActive, handleEyedropperPick, addToDraft, removeFromDraft, canPaint, user, playSound, requireWallet, brushSize, paintTool, selection.isSelecting, clearValidation, draftPixels]);

  const handleZoomIn = useCallback(() => mapRef.current?.zoomIn(), []);
  const handleZoomOut = useCallback(() => mapRef.current?.zoomOut(), []);

  const handleValidate = useCallback(async () => {
    if (!user) { toast.error('Please connect wallet first'); return; }
    // Check if eraser is active (selectedColor === null) in paint mode
    const isEraseAction = mode === 'paint' && selectedColor === null;
    const gameMode = isEraseAction ? 'ERASE' : getGameMode(mode);
    
    // Use draftPixels for PAINT mode, pendingPixels for others
    const pixelsToValidate = gameMode === 'PAINT' ? getDraftPixels() : pendingPixels;
    
    if (pixelsToValidate.length === 0) {
      toast.info('No pixels selected');
      return;
    }
    
    // Clear draftDirty before validation to prevent auto-clear race condition
    setDraftDirty(false);
    
    const result = await validate({ mode: gameMode as GameMode, pixels: pixelsToValidate, color: gameMode === 'PAINT' ? selectedColor : undefined, pePerPixel: gameMode !== 'PAINT' && gameMode !== 'ERASE' ? pePerPixel : undefined });
    
    // Track validation completion time to prevent immediate auto-invalidation
    if (result) {
      lastValidationTimeRef.current = Date.now();
    }
  }, [user, mode, pendingPixels, selectedColor, pePerPixel, validate, getGameMode, getDraftPixels, setDraftDirty]);

  const handleClearSelection = useCallback(() => { clearSelection(); clearValidation(); setPendingPixels([]); playSound('pixel_deselect'); }, [clearSelection, clearValidation, playSound]);

  const handleConfirm = useCallback(async () => {
    // Check if eraser is active (selectedColor === null) in paint mode
    const isEraseAction = mode === 'paint' && selectedColor === null;
    const gameMode = isEraseAction ? 'ERASE' : getGameMode(mode);
    
    // Use draftPixels for PAINT mode, pendingPixels for others
    const pixelsToCommit = gameMode === 'PAINT' ? getDraftPixels() : pendingPixels;
    
    if (pixelsToCommit.length === 0) {
      toast.info('No pixels to commit');
      return;
    }
    
    if (!validationResult?.ok) {
      if (gameMode === 'PAINT') {
        const result = await validate({ mode: 'PAINT', pixels: pixelsToCommit, color: selectedColor });
        if (!result?.ok) return;
        const success = await commit({ mode: 'PAINT', pixels: pixelsToCommit, color: selectedColor, snapshotHash: result.snapshotHash });
        if (success) { 
          // Optimistic update - add pixels to tile cache and dbPixels immediately
          addPixels(pixelsToCommit.map(({ x, y }) => ({ x, y, color: selectedColor! })));
          refreshUser(); 
          clearDraft();
          handleClearSelection();
          playSound('paint_commit');
        }
      } else if (gameMode === 'ERASE') {
        const result = await validate({ mode: 'ERASE', pixels: pixelsToCommit });
        if (!result?.ok) return;
        const success = await commit({ mode: 'ERASE', pixels: pixelsToCommit, snapshotHash: result.snapshotHash });
        if (success) { 
          // Optimistic removal - remove pixels from UI immediately
          removePixels(pixelsToCommit);
          refreshUser(); 
          handleClearSelection();
          playSound('erase_success');
        }
      }
      return;
    }
    const success = await commit({ mode: gameMode as GameMode, pixels: pixelsToCommit, color: gameMode === 'PAINT' ? selectedColor : undefined, pePerPixel: gameMode !== 'PAINT' && gameMode !== 'ERASE' ? pePerPixel : undefined, snapshotHash: validationResult.snapshotHash });
    if (success) {
      if (gameMode === 'PAINT') {
        // Optimistic update - add pixels to tile cache and dbPixels immediately
        addPixels(pixelsToCommit.map(({ x, y }) => ({ x, y, color: selectedColor! })));
        clearDraft();
        playSound('paint_commit');
      } else if (gameMode === 'ERASE') {
        // Optimistic removal - remove pixels from UI immediately
        removePixels(pixelsToCommit);
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
  }, [validationResult, mode, pendingPixels, selectedColor, pePerPixel, commit, validate, getGameMode, refreshUser, handleClearSelection, playSound, getDraftPixels, clearDraft, removePixels, addPixels]);

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

  // Exclude invalid pixels from ERASE selection (for partial-valid flow)
  const handleExcludeInvalid = useCallback(() => {
    if (!invalidPixels || invalidPixels.length === 0) return;
    
    // Create set of invalid pixel keys
    const invalidKeys = new Set(invalidPixels.map(p => `${p.x}:${p.y}`));
    
    // Filter pendingPixels to exclude invalid ones
    const validPixels = pendingPixels.filter(p => !invalidKeys.has(`${p.x}:${p.y}`));
    setPendingPixels(validPixels);
    
    // Also remove from brushSelection
    invalidPixels.forEach(p => {
      brushSelection.pixels.delete(`${p.x}:${p.y}`);
    });
    
    // Clear validation to force re-validate with new selection
    clearValidation();
    
    // If no valid pixels remain, show message
    if (validPixels.length === 0) {
      toast.info('No valid pixels to erase in selection');
    } else {
      toast.success(`Excluded ${invalidPixels.length} invalid pixel(s)`);
    }
  }, [invalidPixels, pendingPixels, brushSelection, clearValidation]);

  const handleCloseInspector = useCallback(() => {
    setInspectedPixel(null);
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col">
      <div className="flex-1 relative overflow-hidden">
        <div ref={containerRef} className="absolute inset-0" />

        {/* Touch/Pointer interaction layer - captures touch events for mobile painting */}
        {mapReady && canPaint && (
          <div
            ref={interactionLayerRef}
            className={cn(
              "absolute inset-0 z-[5]",
              // Dynamic touch-action based on mode
              interactionMode === 'draw'
                ? "touch-action-none"
                : "touch-action-pan-zoom"
            )}
            style={{ pointerEvents: interactionMode === 'draw' ? 'auto' : 'none' }}
          />
        )}

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
            inspectBrushSelectionPixels={inspectBrushSelection.pixels}
            isInspectSelecting={isSpaceHeld && interactionMode === 'drag'}
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
            <div className="flex flex-col items-center gap-2">
              <MapToolbar mode={mode} onModeChange={setMode} />
              {/* Zoom helper button - shows when too zoomed out to paint */}
              {!canPaint && (
                <button
                  onClick={() => {
                    if (!mapRef.current) return;
                    mapRef.current.flyTo({
                      center: mapRef.current.getCenter(),
                      zoom: Z_SHOW_PAINTS,
                      duration: 600
                    });
                  }}
                  className="px-3 py-1.5 text-xs font-medium rounded-full bg-muted/50 text-foreground hover:bg-muted border border-border transition-colors pointer-events-auto"
                >
                  Zoom in to see paints
                </button>
              )}
            </div>
          </HudSlot>
          <HudSlot position="top-right">
            <WalletButton />
          </HudSlot>
          <HudSlot position="bottom-right">
            <ZoomControls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} artOpacity={artOpacity} onToggleArtOpacity={toggleArtOpacity} />
          </HudSlot>
        </HudOverlay>

        {/* Action Tray - always visible */}
        <ActionTray
          mode={mode}
          paintTool={paintTool}
          brushSize={brushSize}
          selectedColor={selectedColor}
          interactionMode={interactionMode}
          zoom={zoom}
          draftCount={draftCount}
          selectionCount={pendingPixels.length}
          pePerPixel={pePerPixel}
          availablePe={peBalance.free}
          isEyedropperActive={isEyedropperActive}
          onEyedropperToggle={setIsEyedropperActive}
          onColorSelect={setSelectedColor}
          onPaintToolChange={setPaintTool}
          onBrushSizeChange={setBrushSize}
          onInteractionModeChange={setInteractionMode}
          onPePerPixelChange={setPePerPixel}
        />

        {/* Pixel Info Panel (read-only) */}
        <PixelInspectorDrawer
          pixel={inspectedPixel}
          onClose={handleCloseInspector}
          currentUserId={user?.id}
          actionSelectionCount={pendingPixels.length + draftCount}
        />

        {/* Inspector Panel for draft or pending pixels - NEVER show in HAND mode */}
        {canPaint && interactionMode === 'draw' && (pendingPixels.length > 0 || draftCount > 0) && (
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
                onBack={validationResult?.ok ? clearValidation : undefined}
                onExcludeInvalid={(mode === 'paint' && selectedColor === null) ? handleExcludeInvalid : undefined}
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

        {/* Inspect Selection Panel (HAND mode SPACE multi-select) */}
        {inspectSelection.length > 0 && (
          <div className="absolute bottom-24 left-4 z-30">
            <InspectSelectionPanel
              selectedPixels={inspectSelection}
              currentUserId={user?.id}
              onClearSelection={() => {
                setInspectSelection([]);
                clearInspectBrushSelection();
              }}
            />
          </div>
        )}
      </div>
      <StatusStrip userId={user?.id} paintQueueSize={queueSize} isSpacePainting={isSpacePainting || isDrawingRef.current} isFlushing={isFlushing} draftCount={draftCount} />
      
      {/* Performance HUD (visible only with ?debug=1) */}
      <PerfHud />
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
