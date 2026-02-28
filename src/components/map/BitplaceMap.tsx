import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

import { CanvasOverlay } from './CanvasOverlay';
import { MapToolbar } from './MapToolbar';
import { ZoomControls } from './ZoomControls';
import { InspectorPanel } from './inspector';
import { InspectSelectionPanel } from './inspector/InspectSelectionPanel';
import { MobileActionDock } from './MobileActionDock';
import { StatusStrip } from './StatusStrip';
import { HudOverlay, HudSlot } from './HudOverlay';
import { PixelInspectorDrawer } from './PixelInspectorDrawer';
import { ActionTray } from './ActionTray';
import { MapMenuDrawer } from './MapMenuDrawer';
import { QuickActions } from './QuickActions';
import { PerfHud } from './PerfHud';
import { TemplatesButton } from './TemplatesButton';
import { TemplatesPanel } from './TemplatesPanel';
import { TemplateOverlay } from './TemplateOverlay';
import { GuidedTour } from './GuidedTour';

import { useIsMobile } from '@/hooks/use-mobile';
import { PixelIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { WalletButton } from '@/components/wallet/WalletButton';
import { MobileWalletButton } from '@/components/wallet/MobileWalletButton';
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
import { usePaintStateMachine } from '@/hooks/usePaintStateMachine';
import { useWallet } from '@/contexts/WalletContext';
import { useWalletGate } from '@/hooks/useWalletGate';
import { useMapUrl } from '@/hooks/useMapUrl';
import { useSound } from '@/hooks/useSound';
import { usePeBalance } from '@/hooks/usePeBalance';
import { useStatusStripHeight } from '@/hooks/useStatusStripHeight';
import { useTemplates } from '@/hooks/useTemplates';
import { getValidSessionToken } from '@/lib/authHelpers';
import { computePixelHash } from '@/lib/pixelHash';
import { lngLatToGridInt, gridIntToLngLat, getViewportGridBounds, Z_SHOW_PAINTS, getCellSize, canInteractAtZoom } from '@/lib/pixelGrid';
import { hapticsEngine } from '@/lib/hapticsEngine';
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

  // Parse URL position directly from window.location.search at mount time
  // This avoids race conditions with React Router's useSearchParams
  const initialUrlPos = useRef((() => {
    const params = new URLSearchParams(window.location.search);
    const lat = params.get('lat');
    const lng = params.get('lng');
    const z = params.get('z');
    const px = params.get('px');
    const py = params.get('py');

    if (lat && lng) {
      const parsedLat = parseFloat(lat);
      const parsedLng = parseFloat(lng);
      if (!isNaN(parsedLat) && !isNaN(parsedLng) &&
          Math.abs(parsedLat) <= 90 && Math.abs(parsedLng) <= 180) {
        const result: {
          lat: number; lng: number; zoom: number;
          pixelX: number | undefined; pixelY: number | undefined;
        } = {
          lat: parsedLat,
          lng: parsedLng,
          zoom: z ? parseFloat(z) : 8,
          pixelX: undefined,
          pixelY: undefined,
        };
        if (px && py) {
          const parsedPx = parseInt(px, 10);
          const parsedPy = parseInt(py, 10);
          if (!isNaN(parsedPx) && !isNaN(parsedPy) && parsedPx >= 0 && parsedPy >= 0) {
            result.pixelX = parsedPx;
            result.pixelY = parsedPy;
          }
        }
        return result;
      }
    }
    return null;
  })());
  const interactionLayerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [hoverPixel, setHoverPixel] = useState<{ x: number; y: number } | null>(null);
  const [inspectedPixel, setInspectedPixel] = useState<{ x: number; y: number } | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 20, lng: 0 });
  const [isEyedropperActive, setIsEyedropperActive] = useState(false);
  const [isSpaceHeld, setIsSpaceHeld] = useState(false);
  const [isShiftHeld, setIsShiftHeld] = useState(false);
  const rectAnchorRef = useRef<{ x: number; y: number } | null>(null);
  const [rectPreview, setRectPreview] = useState<{ start: { x: number; y: number }; end: { x: number; y: number } } | null>(null);
  const isTouchPaintingRef = useRef(false);
  const lastPaintedPixelRef = useRef<{ x: number; y: number } | null>(null);
  
  const [pendingPixels, setPendingPixels] = useState<{ x: number; y: number }[]>([]);
  const [inspectSelection, setInspectSelection] = useState<{ x: number; y: number }[]>([]);
  const [pePerPixel, setPePerPixel] = useState(1);
  const [actionDirection, setActionDirection] = useState<'deposit' | 'withdraw'>('deposit');
  const [previewHiddenPixels, setPreviewHiddenPixels] = useState<Set<string>>(new Set());
  const [validatedActionPixels, setValidatedActionPixels] = useState<Set<string> | null>(null);
  const [isPinPlacementMode, setIsPinPlacementMode] = useState(false);
  const [pinDragStart, setPinDragStart] = useState<{ screenX: number; screenY: number; lng: number; lat: number } | null>(null);
  const [pinDragEnd, setPinDragEnd] = useState<{ screenX: number; screenY: number } | null>(null);
  const isPinDraggingRef = useRef(false);
  
  const { user, walletAddress, refreshUser, connect, isConnecting, updatePeStatus, energy, isGoogleOnly } = useWallet();
  const { isWalletModalOpen, setWalletModalOpen, requireWallet } = useWalletGate();
  const { getUrlPosition, setUrlPosition } = useMapUrl();
  const { localPixels, paintPixel, mergePixels, confirmPixel } = usePixelStore();
  const { selection, startSelection, updateSelection, endSelection, clearSelection, getNormalizedBounds, getSelectedPixels } = useSelection();
  const { mode, selectedColor, paintTool, brushSize, zoom, artOpacity, interactionMode, setMode, setSelectedColor, setZoom, toggleArtOpacity, setInteractionMode, setPaintTool, setBrushSize, canPaint } = useMapState();
  const { dbPixels, updateViewport, removePixels, addPixels, reconcileTiles, realtimeStatus, reconnectAttempts } = useSupabasePixels(zoom);
  const { validate, commit, validationResult, setValidationResult, invalidPixels, setInvalidPixels, isValidating, isCommitting, clearValidation, progress: gameProgress, lastError, isStalled, clearError } = useGameActions();
  const { 
    state: paintState, 
    frozenPayload, 
    lastCommitFailed,
    enterDraft,
    freeze: freezePayload,
    startValidation: startPaintValidation,
    completeValidation: completePaintValidation,
    failValidation: failPaintValidation,
    startCommit: startPaintCommit,
    completeCommit: completePaintCommit,
    failCommit: failPaintCommit,
    invalidate: invalidatePaintState,
    reset: resetPaintState,
    checkSelectionChanged,
  } = usePaintStateMachine();
  const { queue: paintQueue, queueSize, isSpacePainting, isFlushing, startSpacePaint, stopSpacePaint, addToQueue, flushQueue } = usePaintQueue(paintPixel, confirmPixel);
  const { draft: draftPixels, draftCount, draftColor, isAtLimit: isDraftAtLimit, draftDirty, remainingCapacity: draftRemainingCapacity, addToDraft, removeFromDraft, removeInvalidFromDraft, undoLast: undoDraft, clearDraft, getDraftPixels, getDraftPixelsWithColor, setDraftDirty } = useDraftPaint();
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
  const isMobile = useIsMobile();
  const { height: statusStripHeight, setRef: setStatusStripRef } = useStatusStripHeight();
  const { templates, activeTemplateId, activeTemplate, addTemplate, removeTemplate, selectTemplate, updateSettings, isMoveMode, toggleMoveMode, updatePosition } = useTemplates(walletAddress);
  const [templatesPanelOpen, setTemplatesPanelOpen] = useState(false);
  const [templateGuideColors, setTemplateGuideColors] = useState<string[]>([]);
  const templateDragOffsetRef = useRef<{ dx: number; dy: number } | null>(null);
  const pendingScaleRef = useRef<number | null>(null);

  // Auto-center and auto-scale template on add
  const handleAddTemplate = useCallback(async (file: File) => {
    const map = mapRef.current;
    if (!map) {
      await addTemplate(file);
      return;
    }

    // Read image dimensions
    const imgUrl = URL.createObjectURL(file);
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imgUrl;
    });
    URL.revokeObjectURL(imgUrl);

    const imgW = img.width;
    const imgH = img.height;

    // Calculate viewport in grid cells
    const container = map.getContainer();
    const z = map.getZoom();
    const cellSize = getCellSize(z);
    const vpGridW = container.clientWidth / cellSize;
    const vpGridH = container.clientHeight / cellSize;

    // Scale so image fits ~60% of viewport
    const fitRatio = 0.6;
    const scaleX = (vpGridW * fitRatio / imgW) * 100;
    const scaleY = (vpGridH * fitRatio / imgH) * 100;
    const finalScale = Math.max(1, Math.min(400, Math.round(Math.min(scaleX, scaleY))));

    // Center position
    const center = map.getCenter();
    const gridCenter = lngLatToGridInt(center.lng, center.lat);
    const scaledW = imgW * finalScale / 100;
    const scaledH = imgH * finalScale / 100;
    const posX = Math.round(gridCenter.x - scaledW / 2);
    const posY = Math.round(gridCenter.y - scaledH / 2);

    pendingScaleRef.current = finalScale;
    await addTemplate(file, { x: posX, y: posY });
  }, [addTemplate]);

  // Apply pending scale after template is added (activeTemplateId changes)
  useEffect(() => {
    if (pendingScaleRef.current !== null && activeTemplateId) {
      updateSettings(activeTemplateId, { scale: pendingScaleRef.current, initialScale: pendingScaleRef.current });
      pendingScaleRef.current = null;
    }
  }, [activeTemplateId, updateSettings]);

  // Tour: listen for sign-in events to open/close the wallet modal
  useEffect(() => {
    const openHandler = () => setWalletModalOpen(true);
    const closeHandler = () => setWalletModalOpen(false);
    window.addEventListener('bitplace:tour-open-signin', openHandler);
    window.addEventListener('bitplace:tour-close-signin', closeHandler);
    return () => {
      window.removeEventListener('bitplace:tour-open-signin', openHandler);
      window.removeEventListener('bitplace:tour-close-signin', closeHandler);
    };
  }, [setWalletModalOpen]);

  // Track if selection changed after validation (for auto-invalidation hint)
  const isSelectionChangedAfterValidation = useMemo(() => {
    if (paintState !== 'VALIDATED' || !frozenPayload) return false;
    const currentDraftPixels = getDraftPixels();
    return checkSelectionChanged(currentDraftPixels);
  }, [paintState, frozenPayload, getDraftPixels, checkSelectionChanged]);

  // Remember if draw mode was auto-switched to drag by zoom-out
  const wasDrawBeforeAutoSwitch = useRef(false);

  // Auto-switch draw↔drag when crossing the paint-zoom threshold
  useEffect(() => {
    const canInteract = canInteractAtZoom(zoom);
    if (interactionMode === 'draw' && !canInteract) {
      // Zoomed out beyond threshold → auto-switch to drag, remember
      wasDrawBeforeAutoSwitch.current = true;
      setInteractionMode('drag');
    } else if (interactionMode === 'drag' && canInteract && wasDrawBeforeAutoSwitch.current) {
      // Zoomed back in → restore draw
      wasDrawBeforeAutoSwitch.current = false;
      setInteractionMode('draw');
    }
  }, [zoom, interactionMode, setInteractionMode]);

  // Reset the auto-switch memory when user manually changes mode in paintable zone
  useEffect(() => {
    if (canInteractAtZoom(zoom) && interactionMode === 'drag') {
      // User is in drag while paintable — if it wasn't auto-switched, clear memory
      wasDrawBeforeAutoSwitch.current = false;
    }
  }, [interactionMode, zoom]);

  // Reset to default brush when wallet disconnects (keep BRUSH tool, not ERASER)
  useEffect(() => {
    if (!user) {
      setSelectedColor('#ffffff');
    }
  }, [user, setSelectedColor]);

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
    const baseMode = mapMode.toUpperCase() as GameMode;
    // Map to withdraw modes when direction is 'withdraw'
    if (actionDirection === 'withdraw') {
      if (baseMode === 'DEFEND') return 'WITHDRAW_DEF';
      if (baseMode === 'ATTACK') return 'WITHDRAW_ATK';
      if (baseMode === 'REINFORCE') return 'WITHDRAW_REINFORCE';
    }
    return baseMode;
  }, [actionDirection]);

  // Touch/Pointer handling callbacks for mobile support
  const handleTouchPaintStart = useCallback((x: number, y: number) => {
    if (!requireWallet('paint')) return;
    
    // Paint with brush - gate if no color selected
    if (mode === 'paint' && paintTool === 'BRUSH') {
      if (selectedColor === null) {
        toast.info('Select a color to paint', { id: 'no-color-hint' });
        hapticsEngine.trigger('warning');
        return;
      }
      if (brushSize === '2x2') {
        if (draftRemainingCapacity <= 0) return;
        const block = getSnapped2x2Block(x, y)
          .filter(p => !draftPixels.has(`${p.x}:${p.y}`))
          .slice(0, draftRemainingCapacity);
        if (block.length === 0) return;
        block.forEach(p => addToDraft(p.x, p.y, selectedColor));
        lastDraftedPixelRef.current = getSnapped2x2Block(x, y)[0];
      } else {
        addToDraft(x, y, selectedColor);
        lastDraftedPixelRef.current = { x, y };
      }
      isTouchPaintingRef.current = true;
      playSound('pixel_select');
      hapticsEngine.trigger('light'); // Haptic feedback for paint
    }
    // Eraser
    else if (paintTool === 'ERASER') {
      const draftKey = `${x}:${y}`;
      if (draftPixels.has(draftKey)) {
        removeFromDraft(x, y);
        playSound('pixel_deselect');
        hapticsEngine.trigger('light'); // Haptic feedback for erase
      } else {
        startBrushSelection(x, y);
        hapticsEngine.trigger('medium'); // Haptic feedback for selection
      }
      isTouchPaintingRef.current = true;
    }
    // Action modes (DEFEND/ATTACK/REINFORCE)
    else if (['defend', 'attack', 'reinforce'].includes(mode)) {
      if (!requireWallet('interact')) return;
      startBrushSelection(x, y);
      isTouchPaintingRef.current = true;
      hapticsEngine.trigger('medium'); // Haptic feedback for action selection
    }
  }, [mode, paintTool, selectedColor, brushSize, addToDraft, removeFromDraft, startBrushSelection, draftPixels, draftRemainingCapacity, requireWallet, playSound]);

  const handleTouchPaintMove = useCallback((x: number, y: number) => {
    // Paint with brush (continuous) - only if color selected
    if (mode === 'paint' && paintTool === 'BRUSH' && selectedColor !== null) {
      const last = lastDraftedPixelRef.current;
      if (brushSize === '2x2') {
        const block = getSnapped2x2Block(x, y);
        const topLeft = block[0];
        if (!last || last.x !== topLeft.x || last.y !== topLeft.y) {
          if (draftRemainingCapacity <= 0) return;
          const toAdd = block
            .filter(p => !draftPixels.has(`${p.x}:${p.y}`))
            .slice(0, draftRemainingCapacity);
          if (toAdd.length > 0) {
            toAdd.forEach(p => addToDraft(p.x, p.y, selectedColor));
            lastDraftedPixelRef.current = topLeft;
            hapticsEngine.trigger('light'); // Light haptic for each new pixel
          }
        }
      } else {
        if (!last || last.x !== x || last.y !== y) {
          addToDraft(x, y, selectedColor);
          lastDraftedPixelRef.current = { x, y };
          hapticsEngine.trigger('light'); // Light haptic for each new pixel
        }
      }
    }
    // Eraser (continuous)
    else if (paintTool === 'ERASER') {
      const draftKey = `${x}:${y}`;
      if (draftPixels.has(draftKey)) {
        removeFromDraft(x, y);
        hapticsEngine.trigger('light');
      } else {
        addToBrushSelection(x, y);
      }
    }
    // Action modes (continuous selection)
    else if (['defend', 'attack', 'reinforce'].includes(mode)) {
      addToBrushSelection(x, y);
    }
  }, [mode, paintTool, selectedColor, brushSize, addToDraft, removeFromDraft, addToBrushSelection, draftPixels, draftRemainingCapacity]);

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
      enabled: mapReady && (canPaint || isMoveMode),
      isHandMode: interactionMode === 'drag' && !isMoveMode,
      callbacks: {
        onPointerStart: (x, y, type) => {
          // Template move mode: start drag
          if (isMoveMode && activeTemplateId) {
            isDraggingRef.current = true;
            const tmpl = templates.find(t => t.id === activeTemplateId);
            if (tmpl) {
              templateDragOffsetRef.current = {
                dx: x - tmpl.positionX,
                dy: y - tmpl.positionY,
              };
            }
            return;
          }
          if (interactionMode === 'drag') return; // Let map handle in HAND mode
          handleTouchPaintStart(x, y);
        },
        onPointerMove: (x, y, type) => {
          // Template move mode: update position
          if (isMoveMode && activeTemplateId && isDraggingRef.current) {
            const offset = templateDragOffsetRef.current || { dx: 0, dy: 0 };
            updatePosition(activeTemplateId, { x: x - offset.dx, y: y - offset.dy });
            return;
          }
          if (interactionMode === 'drag') return;
          if (isTouchPaintingRef.current) {
            handleTouchPaintMove(x, y);
          }
        },
        onPointerEnd: (x, y, type, wasTap) => {
          // Template move mode: end drag
          if (isMoveMode && isDraggingRef.current) {
            isDraggingRef.current = false;
            templateDragOffsetRef.current = null;
            return;
          }
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
    
    // Use position captured at mount time from window.location.search
    const urlPos = initialUrlPos.current;
    
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
      dragRotate: false,
      touchPitch: false,
      pitchWithRotate: false,
      renderWorldCopies: true,
      maxBounds: [[-Infinity, -85], [Infinity, 85]] as any,
      attributionControl: false,
      canvasContextAttributes: { preserveDrawingBuffer: true },
    } as maplibregl.MapOptions);

    // Disable touch rotation while keeping pinch-to-zoom
    map.touchZoomRotate.disableRotation();

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
      
      // Update map center for Places modal
      const center = map.getCenter();
      setMapCenter({ lat: center.lat, lng: center.lng });
    };

    map.on('load', () => {
      mapRef.current = map;
      setMapReady(true);
      
      // Sync zoom state immediately so canPaint is correct from the start
      setZoomRef.current(map.getZoom());
      // Trigger initial tile fetch so pixels are visible without user interaction
      updateBounds();
      
      // Open inspector for URL pixel after a brief delay for map to settle
      if (urlPixelRef.current) {
        setTimeout(() => {
          setInspectedPixel(urlPixelRef.current);
          urlPixelRef.current = null;
        }, 500);
      }
    });

    map.on('zoom', () => setZoomRef.current(map.getZoom()));

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
      
      // Reset to explore mode and close inspector
      setInteractionMode('drag');
      setInspectedPixel(null);
      
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
  }, [setUrlPosition, setInteractionMode]);

  // Pin placement mode
  useEffect(() => {
    const handleStartPinPlacement = () => setIsPinPlacementMode(true);
    const handleCancelPinPlacement = () => setIsPinPlacementMode(false);

    window.addEventListener('bitplace:start-pin-placement', handleStartPinPlacement);
    window.addEventListener('bitplace:cancel-pin-placement', handleCancelPinPlacement);
    return () => {
      window.removeEventListener('bitplace:start-pin-placement', handleStartPinPlacement);
      window.removeEventListener('bitplace:cancel-pin-placement', handleCancelPinPlacement);
    };
  }, []);

  // Drag-to-select rectangle for pin placement
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    if (isPinPlacementMode) {
      map.getCanvas().style.cursor = 'crosshair';
      map.dragPan.disable();

      const handleMouseDown = (e: maplibregl.MapMouseEvent) => {
        const point = e.point;
        const lngLat = e.lngLat;
        setPinDragStart({ screenX: point.x, screenY: point.y, lng: lngLat.lng, lat: lngLat.lat });
        setPinDragEnd({ screenX: point.x, screenY: point.y });
        isPinDraggingRef.current = true;
      };

      const handleMouseMove = (e: maplibregl.MapMouseEvent) => {
        if (!isPinDraggingRef.current) return;
        setPinDragEnd({ screenX: e.point.x, screenY: e.point.y });
      };

      const handleMouseUp = async (e: maplibregl.MapMouseEvent) => {
        if (!isPinDraggingRef.current || !pinDragStart) return;
        isPinDraggingRef.current = false;

        const endLngLat = e.lngLat;
        const startGrid = lngLatToGridInt(pinDragStart.lng, pinDragStart.lat);
        const endGrid = lngLatToGridInt(endLngLat.lng, endLngLat.lat);

        const bbox = {
          xmin: Math.min(startGrid.x, endGrid.x),
          ymin: Math.min(startGrid.y, endGrid.y),
          xmax: Math.max(startGrid.x, endGrid.x),
          ymax: Math.max(startGrid.y, endGrid.y),
        };

        // Minimum size check (at least 2x2 grid pixels)
        if (bbox.xmax - bbox.xmin < 2 && bbox.ymax - bbox.ymin < 2) {
          setPinDragStart(null);
          setPinDragEnd(null);
          toast.info('Drag a larger area to select', { id: 'pin-area-too-small' });
          return;
        }

        // Calculate center
        const centerX = Math.round((bbox.xmin + bbox.xmax) / 2);
        const centerY = Math.round((bbox.ymin + bbox.ymax) / 2);
        const centerLngLat = gridIntToLngLat(centerX, centerY);
        const currentZoom = map.getZoom();

        // Capture map canvas snapshot cropped to selection area
        let mapSnapshot = '';
        try {
          const mapCanvas = map.getCanvas();
          const dpr = window.devicePixelRatio || 1;
          const sx = Math.min(pinDragStart.screenX, e.point.x);
          const sy = Math.min(pinDragStart.screenY, e.point.y);
          const sw = Math.abs(e.point.x - pinDragStart.screenX);
          const sh = Math.abs(e.point.y - pinDragStart.screenY);
          if (sw > 0 && sh > 0) {
            const cropCanvas = document.createElement('canvas');
            cropCanvas.width = sw * dpr;
            cropCanvas.height = sh * dpr;
            const cropCtx = cropCanvas.getContext('2d');
            if (cropCtx) {
              cropCtx.drawImage(mapCanvas, sx * dpr, sy * dpr, sw * dpr, sh * dpr, 0, 0, sw * dpr, sh * dpr);
              mapSnapshot = cropCanvas.toDataURL('image/jpeg', 0.8);
            }
          }
        } catch (snapErr) {
          console.warn('[BitplaceMap] Map snapshot capture failed:', snapErr);
        }

        // Fetch pixels in the selected area with pagination
        try {
          const PAGE = 1000;
          const allPixels: { x: number; y: number; color: string }[] = [];
          let offset = 0;
          let hasMore = true;
          while (hasMore) {
            const { data } = await supabase
              .from('pixels')
              .select('x, y, color')
              .gte('x', bbox.xmin)
              .lte('x', bbox.xmax)
              .gte('y', bbox.ymin)
              .lte('y', bbox.ymax)
              .range(offset, offset + PAGE - 1);
            allPixels.push(...((data as { x: number; y: number; color: string }[]) || []));
            hasMore = (data?.length || 0) === PAGE;
            offset += PAGE;
          }

          setIsPinPlacementMode(false);
          setPinDragStart(null);
          setPinDragEnd(null);
          map.dragPan.enable();
          map.getCanvas().style.cursor = '';

          window.dispatchEvent(new CustomEvent('bitplace:pin-placed', {
            detail: {
              lat: centerLngLat.lat,
              lng: centerLngLat.lng,
              x: centerX,
              y: centerY,
              zoom: currentZoom,
              bbox,
              artworkPixels: allPixels,
              mapSnapshot,
            }
          }));
        } catch (err) {
          console.error('[BitplaceMap] Pixel fetch for pin area failed:', err);
          setIsPinPlacementMode(false);
          setPinDragStart(null);
          setPinDragEnd(null);
          map.dragPan.enable();
          map.getCanvas().style.cursor = '';
          toast.error('Failed to load pixels for this area');
        }
      };

      map.on('mousedown', handleMouseDown);
      map.on('mousemove', handleMouseMove);
      map.on('mouseup', handleMouseUp);

      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setIsPinPlacementMode(false);
          isPinDraggingRef.current = false;
          setPinDragStart(null);
          setPinDragEnd(null);
          map.dragPan.enable();
          map.getCanvas().style.cursor = '';
        }
      };
      window.addEventListener('keydown', handleEsc);

      return () => {
        map.off('mousedown', handleMouseDown);
        map.off('mousemove', handleMouseMove);
        map.off('mouseup', handleMouseUp);
        window.removeEventListener('keydown', handleEsc);
        map.dragPan.enable();
        map.getCanvas().style.cursor = '';
      };
    }
  }, [isPinPlacementMode, mapReady, pinDragStart]);

  // SPACE key handling for hover-paint, SHIFT for selection, ESC to cancel
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when typing in form fields
      const tag = (document.activeElement?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

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
        
        // SPACE in HAND mode enables rectangular area select for inspect
        if (interactionMode === 'drag') {
          setIsSpaceHeld(true);
          map.dragPan.disable();
          map.getCanvas().style.cursor = 'crosshair';
          if (hoverPixel) {
            rectAnchorRef.current = { x: hoverPixel.x, y: hoverPixel.y };
            setRectPreview({ start: hoverPixel, end: hoverPixel });
          }
          return;
        }
        
        // Below: DRAW mode only
        // In non-PAINT modes OR ERASER tool: SPACE enables brush selection
        const isNonPaintAction = mode !== 'paint' || paintTool === 'ERASER';
        
        if (isNonPaintAction) {
          // Rectangular selection mode for ERASE/DEFEND/ATTACK/REINFORCE
          if (!requireWallet('interact')) return;
          setIsSpaceHeld(true);
          map.dragPan.disable();
          map.getCanvas().style.cursor = 'crosshair';
          if (hoverPixel) {
            rectAnchorRef.current = { x: hoverPixel.x, y: hoverPixel.y };
            setRectPreview({ start: hoverPixel, end: hoverPixel });
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
              if (draftRemainingCapacity <= 0) return;
              const block = getSnapped2x2Block(hoverPixel.x, hoverPixel.y)
                .filter(p => !draftPixels.has(`${p.x}:${p.y}`))
                .slice(0, draftRemainingCapacity);
              if (block.length > 0) {
                block.forEach(p => addToDraft(p.x, p.y, selectedColor));
                lastDraftedPixelRef.current = getSnapped2x2Block(hoverPixel.x, hoverPixel.y)[0];
              }
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
      // Don't intercept when typing in form fields
      const tag = (document.activeElement?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      // SPACE release
      if (e.code === 'Space' && isSpaceHeld) {
        setIsSpaceHeld(false);
        
        // HAND MODE: End rectangular inspect selection
        if (interactionMode === 'drag') {
          if (rectAnchorRef.current && rectPreview) {
            const start = rectAnchorRef.current;
            const end = rectPreview.end;
            const minX = Math.min(start.x, end.x);
            const maxX = Math.max(start.x, end.x);
            const minY = Math.min(start.y, end.y);
            const maxY = Math.max(start.y, end.y);
            const pixels: { x: number; y: number }[] = [];
            for (let x = minX; x <= maxX && pixels.length < MAX_BRUSH_SELECTION; x++) {
              for (let y = minY; y <= maxY && pixels.length < MAX_BRUSH_SELECTION; y++) {
                pixels.push({ x, y });
              }
            }
            if (pixels.length > 0) {
              setInspectSelection(pixels);
              // Also populate inspect brush selection set for overlay rendering
              clearInspectBrushSelection();
              // Use setFromRectSelection on inspect brush to show the filled area
            }
          }
            rectAnchorRef.current = null;
            // Keep rectPreview visible for inspect selection
            map.dragPan.enable();
            map.getCanvas().style.cursor = '';
            return;
        }
        
        // DRAW MODE: Check if we were in brush selection mode (non-PAINT or ERASER)
        const isNonPaintAction = mode !== 'paint' || paintTool === 'ERASER';
        
        if (isNonPaintAction) {
          // Build pixel array from rect selection if available (same as HAND mode)
          let selectedPixels: { x: number; y: number }[] = [];
          if (rectAnchorRef.current && rectPreview) {
            const start = rectAnchorRef.current;
            const end = rectPreview.end;
            const minX = Math.min(start.x, end.x);
            const maxX = Math.max(start.x, end.x);
            const minY = Math.min(start.y, end.y);
            const maxY = Math.max(start.y, end.y);
            for (let x = minX; x <= maxX && selectedPixels.length < MAX_BRUSH_SELECTION; x++) {
              for (let y = minY; y <= maxY && selectedPixels.length < MAX_BRUSH_SELECTION; y++) {
                selectedPixels.push({ x, y });
              }
            }
            rectAnchorRef.current = null;
            // Keep rectPreview visible until selection is cleared
            map.dragPan.enable();
          } else {
            endBrushSelection();
            selectedPixels = getBrushSelectedPixels();
          }
          
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
  }, [mapReady, mode, canPaint, user, isSpaceHeld, isShiftHeld, interactionMode, selection.isSelecting, endSelection, hoverPixel, selectedColor, addToDraft, requireWallet, pendingPixels.length, clearSelection, clearValidation, playSound, paintTool, brushSize, brushSelection.pixels.size, startBrushSelection, endBrushSelection, getBrushSelectedPixels, clearBrushSelection, draftPixels, draftRemainingCapacity, removeFromDraft]);

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
      setRectPreview(null);
      // Reset actionDirection to deposit on mode change
      if (modeChanged) {
        setActionDirection('deposit');
      }
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
  
  // Auto-invalidate validation when draft changes (state machine integration)
  // Uses state machine's auto-invalidation logic
  useEffect(() => {
    if (draftDirty && validationResult) {
      const timeSinceValidation = Date.now() - lastValidationTimeRef.current;
      // Only auto-invalidate if validation was set more than 200ms ago
      if (timeSinceValidation > 200) {
        clearValidation();
        invalidatePaintState();
        setDraftDirty(false);
      }
    }
  }, [draftDirty, validationResult, clearValidation, setDraftDirty, invalidatePaintState]);
  
  // Enter DRAFT state when user starts drafting
  useEffect(() => {
    if (draftCount > 0 && paintState === 'IDLE') {
      enterDraft();
    } else if (draftCount === 0 && paintState !== 'IDLE') {
      resetPaintState();
    }
  }, [draftCount, paintState, enterDraft, resetPaintState]);

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

  // Template move mode: disable map pan and change cursor
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    
    if (isMoveMode && activeTemplateId) {
      map.dragPan.disable();
      map.getCanvas().style.cursor = 'move';
    } else {
      // Only re-enable if not in other drag-blocking states
      if (!isDraggingRef.current && !isShiftHeld) {
        map.dragPan.enable();
      }
    }
  }, [isMoveMode, activeTemplateId, mapReady, isShiftHeld]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    // Update cursor based on eyedropper state or interaction mode
    const canvas = map.getCanvas();
    if (isMoveMode && activeTemplateId) {
      canvas.style.cursor = 'move';
    } else if (isEyedropperActive) {
      canvas.style.cursor = 'crosshair';
    } else if (interactionMode === 'draw' && canPaint) {
      canvas.style.cursor = 'crosshair';
    } else if (isSpaceHeld) {
      canvas.style.cursor = 'crosshair';
    } else {
      canvas.style.cursor = '';
    }

    const handleMapMouseMove = (e: maplibregl.MapMouseEvent) => {
      // Template move mode: update template position while dragging
      if (isMoveMode && activeTemplateId && isDraggingRef.current) {
        const pixel = lngLatToGridInt(e.lngLat.lng, e.lngLat.lat);
        const offset = templateDragOffsetRef.current || { dx: 0, dy: 0 };
        updatePosition(activeTemplateId, { x: pixel.x - offset.dx, y: pixel.y - offset.dy });
        return;
      }
      
      if (canPaint) {
        // Use lngLatToGridInt for grid-snapped hover
        const pixel = lngLatToGridInt(e.lngLat.lng, e.lngLat.lat);
        setHoverPixel(pixel);
        
        // HAND MODE with SPACE: rectangular area preview
        if (interactionMode === 'drag') {
          if (isSpaceHeld && user && rectAnchorRef.current) {
            setRectPreview({ start: rectAnchorRef.current, end: { x: pixel.x, y: pixel.y } });
          }
          return;
        }
        
        // Check if in non-PAINT action mode or ERASER
        const isNonPaintAction = mode !== 'paint' || paintTool === 'ERASER';
        
        // ERASER or non-PAINT action with SPACE: update rect preview
        if (isSpaceHeld && isNonPaintAction && user && rectAnchorRef.current) {
          setRectPreview({ start: rectAnchorRef.current, end: { x: pixel.x, y: pixel.y } });
        }
        // SPACE held in PAINT mode with brush: add to draft (no backend)
        else if (isSpaceHeld && mode === 'paint' && selectedColor !== null && user) {
          const last = lastDraftedPixelRef.current;
          // For 2x2 brush, snap to block
          if (brushSize === '2x2') {
            const block = getSnapped2x2Block(pixel.x, pixel.y);
            const topLeft = block[0];
            if (!last || last.x !== topLeft.x || last.y !== topLeft.y) {
              if (draftRemainingCapacity <= 0) return;
              const toAdd = block
                .filter(p => !draftPixels.has(`${p.x}:${p.y}`))
                .slice(0, draftRemainingCapacity);
              if (toAdd.length > 0) {
                toAdd.forEach(p => addToDraft(p.x, p.y, selectedColor));
                lastDraftedPixelRef.current = topLeft;
              }
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
      // Template move mode: start template drag
      if (isMoveMode && activeTemplateId) {
        isDraggingRef.current = true;
        const pixel = lngLatToGridInt(e.lngLat.lng, e.lngLat.lat);
        dragStartRef.current = { x: pixel.x, y: pixel.y, screenX: e.point.x, screenY: e.point.y };
        // Calculate offset from click to template top-left
        const tmpl = templates.find(t => t.id === activeTemplateId);
        if (tmpl) {
          templateDragOffsetRef.current = {
            dx: pixel.x - tmpl.positionX,
            dy: pixel.y - tmpl.positionY,
          };
        }
        return;
      }
      
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
      // Template move mode: end template drag
      if (isMoveMode && activeTemplateId && isDraggingRef.current) {
        isDraggingRef.current = false;
        dragStartRef.current = null;
        templateDragOffsetRef.current = null;
        return;
      }
      
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
        } else if (interactionMode === 'drag' && dragDistance < 5 && dragStartRef.current) {
          // HAND/EXPLORE MODE: open inspector regardless of game mode
          const { x, y } = dragStartRef.current;
          setInspectedPixel({ x, y });
          playSound('pixel_select');
        } else if (mode !== 'paint' && dragDistance < 5 && dragStartRef.current) {
          // Single click in non-PAINT mode (DRAW) - select single pixel for action
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
            // Paint: add single pixel to draft - gate if no color
            if (selectedColor === null) {
              toast.info('Select a color to paint', { id: 'no-color-hint' });
              isDraggingRef.current = false;
              dragStartRef.current = null;
              return;
            }
            if (brushSize === '2x2') {
              if (draftRemainingCapacity <= 0) return;
              const block = getSnapped2x2Block(x, y)
                .filter(p => !draftPixels.has(`${p.x}:${p.y}`))
                .slice(0, draftRemainingCapacity);
              if (block.length > 0) {
                block.forEach(p => addToDraft(p.x, p.y, selectedColor));
              }
            } else {
              addToDraft(x, y, selectedColor);
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
  }, [mapReady, mode, selectedColor, interactionMode, isSpaceHeld, isShiftHeld, updateSelection, startSelection, endSelection, clearSelection, isEyedropperActive, handleEyedropperPick, addToDraft, removeFromDraft, canPaint, user, playSound, requireWallet, brushSize, paintTool, selection.isSelecting, clearValidation, draftPixels, draftRemainingCapacity, isMoveMode, activeTemplateId, updatePosition, templates]);

  const handleZoomIn = useCallback(() => mapRef.current?.zoomIn(), []);
  const handleZoomOut = useCallback(() => mapRef.current?.zoomOut(), []);



  const handleValidate = useCallback(async () => {
    // Clear any previous error before starting new validation
    clearError();
    
    console.log('[handleValidate] Starting...', {
      user: !!user,
      mode,
      draftCount,
      pendingPixelsCount: pendingPixels.length,
      selectedColor,
    });
    
    if (!user) { 
      console.log('[handleValidate] No user - aborting');
      toast.error('Please connect wallet first'); 
      return; 
    }
    
    // Check if eraser is active (selectedColor === null) in paint mode
    const isEraseAction = mode === 'paint' && selectedColor === null;
    const gameMode = isEraseAction ? 'ERASE' : getGameMode(mode);
    
    // Use draftPixels for PAINT mode, pendingPixels for others
    const pixelsToValidate = gameMode === 'PAINT' ? getDraftPixelsWithColor() : pendingPixels;
    
    if (pixelsToValidate.length === 0) {
      toast.info('No pixels selected');
      return;
    }
    
    
    // Session check - gate before proceeding
    const token = getValidSessionToken();
    console.log('[handleValidate] Token:', token ? 'present' : 'missing');
    if (!token) {
      setWalletModalOpen(true);
      return;
    }
    
    // STATE MACHINE: Freeze payload for PAINT mode
    if (gameMode === 'PAINT' && selectedColor) {
      freezePayload(pixelsToValidate as { x: number; y: number; color: string }[], selectedColor);
      startPaintValidation();
    }
    
    // Clear draftDirty before validation to prevent auto-clear race condition
    setDraftDirty(false);
    
    const result = await validate({ 
      mode: gameMode as GameMode, 
      pixels: pixelsToValidate, 
      color: gameMode === 'PAINT' ? selectedColor : undefined, 
      pePerPixel: gameMode !== 'PAINT' && gameMode !== 'ERASE' ? pePerPixel : undefined 
    });
    
    // Track validation completion time to prevent immediate auto-invalidation
    if (result) {
      lastValidationTimeRef.current = Date.now();
      
      // STATE MACHINE: Complete or fail validation
      if (gameMode === 'PAINT') {
        if (result.ok || result.partialValid) {
          completePaintValidation(result);
        } else {
          failPaintValidation();
        }
      }
    } else {
      // Validation returned null (error)
      if (gameMode === 'PAINT') {
        failPaintValidation();
      }
    }
  }, [user, mode, pendingPixels, selectedColor, pePerPixel, validate, getGameMode, getDraftPixels, setDraftDirty, setWalletModalOpen, freezePayload, startPaintValidation, completePaintValidation, failPaintValidation, clearError, setValidationResult, setInvalidPixels]);

  const handleClearSelection = useCallback(() => { 
    clearSelection(); 
    clearValidation(); 
    setPendingPixels([]); 
    setRectPreview(null);
    resetPaintState();
    playSound('pixel_deselect'); 
  }, [clearSelection, clearValidation, playSound, resetPaintState]);

  const handleConfirm = useCallback(async () => {
    // Session check - gate before proceeding
    const token = getValidSessionToken();
    if (!token) {
      setWalletModalOpen(true);
      return;
    }
    
    // Check if eraser is active (selectedColor === null) in paint mode
    const isEraseAction = mode === 'paint' && selectedColor === null;
    const gameMode = isEraseAction ? 'ERASE' : getGameMode(mode);
    
    // STATE MACHINE: For PAINT mode, use frozen payload if available (VALIDATED state)
    // This ensures we commit exactly what was validated, not potentially changed draft
    let pixelsToCommit: { x: number; y: number; color?: string }[];
    let colorToCommit: string | null = selectedColor;
    let snapshotHashToUse: string | undefined = validationResult?.snapshotHash;
    
    if (gameMode === 'PAINT' && frozenPayload && paintState === 'VALIDATED') {
      // Use frozen payload (guaranteed to match validation)
      pixelsToCommit = frozenPayload.pixels;
      colorToCommit = frozenPayload.color;
      snapshotHashToUse = frozenPayload.snapshotHash;
    } else {
      // Fallback: use current draft/pending
      pixelsToCommit = gameMode === 'PAINT' ? getDraftPixelsWithColor() : pendingPixels;
    }
    
    if (pixelsToCommit.length === 0) {
      toast.info('No pixels to commit');
      return;
    }
    
    // STATE MACHINE: Start commit for PAINT mode
    if (gameMode === 'PAINT' && paintState === 'VALIDATED') {
      startPaintCommit();
    }
    
    // Allow withdraw modes to bypass ok:false gate when they have valid refund pixels
    const isWithdrawMode = gameMode.startsWith('WITHDRAW_');
    const hasWithdrawRefund = isWithdrawMode && validationResult && 
      (validationResult.breakdown?.pePerType?.withdrawRefund ?? 0) > 0;

    if (!validationResult?.ok && !frozenPayload?.snapshotHash && !hasWithdrawRefund) {
      // No valid validation - need to validate first
      if (gameMode === 'PAINT') {
        freezePayload(pixelsToCommit as { x: number; y: number; color: string }[], colorToCommit!);
        startPaintValidation();
        
        const result = await validate({ mode: 'PAINT', pixels: pixelsToCommit, color: colorToCommit });
        if (!result?.ok) {
          failPaintValidation();
          return;
        }
        
        completePaintValidation(result);
        startPaintCommit();
        
        const success = await commit({ mode: 'PAINT', pixels: pixelsToCommit, color: colorToCommit, snapshotHash: result.snapshotHash });
        if (success) { 
          // PROMPT 55: Use changedPixels from response if available, fallback to draft
          const pixelsForCache = success.changedPixels?.length 
            ? success.changedPixels.map(p => ({ x: p.x, y: p.y, color: p.color }))
            : pixelsToCommit.map(({ x, y }) => ({ x, y, color: colorToCommit! }));
          
          const touchedTiles = addPixels(pixelsForCache);
          
          // PROMPT 55: Update PE status immediately from commit response (no extra API call)
          if (success.peStatus) {
            updatePeStatus(success.peStatus, success.paintCooldownUntil, success.isVirtualPe);
          }
          
          clearDraft();
          completePaintCommit();
          handleClearSelection();
          playSound('paint_commit');
          
          // Background reconciliation (fire-and-forget)
          reconcileTiles(touchedTiles);
        } else {
          failPaintCommit();
        }
      } else if (gameMode === 'ERASE') {
        const result = await validate({ mode: 'ERASE', pixels: pixelsToCommit });
        if (!result?.ok) return;
        const success = await commit({ mode: 'ERASE', pixels: pixelsToCommit, snapshotHash: result.snapshotHash });
        if (success) { 
          // Optimistic removal - remove pixels from UI immediately
          const touchedTiles = removePixels(pixelsToCommit);
          
          // PROMPT 55: Update PE status from commit response
          if (success.peStatus) {
            updatePeStatus(success.peStatus, undefined, success.isVirtualPe);
          }
          
          handleClearSelection();
          playSound('erase_success');
          
          // Background reconciliation
          reconcileTiles(touchedTiles);
        }
      }
      return;
    }
    
    // Have valid validation - proceed with commit using frozen/validated data
    const success = await commit({ 
      mode: gameMode as GameMode, 
      pixels: pixelsToCommit, 
      color: gameMode === 'PAINT' ? colorToCommit : undefined, 
      pePerPixel: gameMode !== 'PAINT' && gameMode !== 'ERASE' ? pePerPixel : undefined, 
      snapshotHash: snapshotHashToUse ?? undefined 
    });
    
    if (success) {
      if (gameMode === 'PAINT') {
        // PROMPT 55: Use changedPixels from response if available, fallback to draft
        const pixelsForCache = success.changedPixels?.length 
          ? success.changedPixels.map(p => ({ x: p.x, y: p.y, color: p.color }))
          : pixelsToCommit.map(({ x, y }) => ({ x, y, color: colorToCommit! }));
        
        const touchedTiles = addPixels(pixelsForCache);
        
        // PROMPT 55: Update PE status immediately from commit response
        if (success.peStatus) {
          updatePeStatus(success.peStatus, success.paintCooldownUntil, success.isVirtualPe);
        }
        
        clearDraft();
        completePaintCommit();
        playSound('paint_commit');
        // Background reconciliation
        reconcileTiles(touchedTiles);
      } else if (gameMode === 'ERASE') {
        // Optimistic removal - remove pixels from UI immediately
        const touchedTiles = removePixels(pixelsToCommit);
        
        // PROMPT 55: Update PE status from commit response
        if (success.peStatus) {
          updatePeStatus(success.peStatus, undefined, success.isVirtualPe);
        }
        
        playSound('erase_success');
        // Background reconciliation
        reconcileTiles(touchedTiles);
      } else if (gameMode === 'DEFEND') {
        if (success.peStatus) updatePeStatus(success.peStatus, undefined, success.isVirtualPe);
        playSound('defend_success');
      } else if (gameMode === 'ATTACK') {
        if (success.peStatus) updatePeStatus(success.peStatus, undefined, success.isVirtualPe);
        playSound('attack_success');
      } else if (gameMode === 'REINFORCE') {
        if (success.peStatus) updatePeStatus(success.peStatus, undefined, success.isVirtualPe);
        playSound('reinforce_success');
      } else if (gameMode === 'WITHDRAW_DEF' || gameMode === 'WITHDRAW_ATK' || gameMode === 'WITHDRAW_REINFORCE') {
        if (success.peStatus) updatePeStatus(success.peStatus, undefined, success.isVirtualPe);
        playSound('reinforce_success');
      }
      handleClearSelection();
    } else {
      // Commit failed - stay in VALIDATED for retry
      if (gameMode === 'PAINT' && paintState === 'COMMITTING') {
        failPaintCommit();
      }
    }
  }, [validationResult, mode, pendingPixels, selectedColor, pePerPixel, commit, validate, getGameMode, handleClearSelection, playSound, getDraftPixels, clearDraft, removePixels, addPixels, reconcileTiles, frozenPayload, paintState, setWalletModalOpen, freezePayload, startPaintValidation, completePaintValidation, failPaintValidation, startPaintCommit, completePaintCommit, failPaintCommit, updatePeStatus, energy.peAvailable, resetPaintState]);

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
        {mapReady && (canPaint || isMoveMode) && (
          <div
            ref={interactionLayerRef}
            className={cn(
              "absolute inset-0 z-[5]",
              // Dynamic touch-action based on mode
              (interactionMode === 'draw' || isMoveMode)
                ? "touch-action-none"
                : "touch-action-pan-zoom"
            )}
            // On mobile/touch: capture in DRAW or MOVE mode for touch painting/dragging
            // On desktop: always 'none' so mouse clicks reach MapLibre canvas
            style={{ pointerEvents: (interactionMode === 'draw' || isMoveMode) && isMobile ? 'auto' : 'none' }}
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
            rectPreview={rectPreview}
          />
        )}

        {/* Template Overlay - between map and HUD */}
        {mapReady && activeTemplate && (
          <TemplateOverlay 
            map={mapRef.current} 
            template={activeTemplate} 
            selectedColor={selectedColor}
            onGuideColorsChange={setTemplateGuideColors}
          />
        )}

        {/* Templates Panel */}
        <TemplatesPanel
          open={templatesPanelOpen}
          onOpenChange={setTemplatesPanelOpen}
          templates={templates}
          activeTemplateId={activeTemplateId}
          isMoveMode={isMoveMode}
          onAddTemplate={handleAddTemplate}
          onRemoveTemplate={removeTemplate}
          onSelectTemplate={selectTemplate}
          onUpdateSettings={updateSettings}
          onRecenter={() => {
            // Move template to current viewport center
            if (mapRef.current && activeTemplateId) {
              const center = mapRef.current.getCenter();
              const gridPos = lngLatToGridInt(center.lng, center.lat);
              updatePosition(activeTemplateId, { x: gridPos.x, y: gridPos.y });
            }
          }}
          onToggleMoveMode={toggleMoveMode}
        />

        {/* HUD Overlay */}
        <HudOverlay>
          <HudSlot position="top-left">
            <div className="flex flex-col gap-2">
              <MapMenuDrawer />
              <TemplatesButton
                isOpen={templatesPanelOpen}
                onToggle={() => setTemplatesPanelOpen(!templatesPanelOpen)}
                hasActiveTemplate={!!activeTemplate}
              />
              <QuickActions />
            </div>
          </HudSlot>
          <HudSlot position="top-center">
            <MapToolbar mode={mode} onModeChange={setMode} isGoogleOnly={isGoogleOnly} />
          </HudSlot>
          <HudSlot position="top-right">
            {isMobile ? <MobileWalletButton /> : <WalletButton />}
          </HudSlot>
          <HudSlot position="bottom-right">
            <ZoomControls artOpacity={artOpacity} onToggleArtOpacity={toggleArtOpacity} />
          </HudSlot>
        </HudOverlay>

        {/* Pin Placement Overlay: Banner + Selection Rectangle */}
        {isPinPlacementMode && (
          <>
            <div className="absolute inset-x-0 top-20 z-50 flex justify-center pointer-events-none">
              <div className="pointer-events-auto flex items-center gap-3 px-4 py-2.5 rounded-xl bg-card/90 backdrop-blur-md border border-border/50 shadow-lg">
                <PixelIcon name="locationPin" size="sm" className="text-primary" />
                <span className="text-sm font-medium">Click and drag to select an area</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => {
                    setIsPinPlacementMode(false);
                    isPinDraggingRef.current = false;
                    setPinDragStart(null);
                    setPinDragEnd(null);
                    if (mapRef.current) {
                      mapRef.current.dragPan.enable();
                      mapRef.current.getCanvas().style.cursor = '';
                    }
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
            {/* Selection rectangle */}
            {pinDragStart && pinDragEnd && (
              <div
                className="absolute z-40 border-2 border-dashed border-white/80 bg-white/10 pointer-events-none"
                style={{
                  left: Math.min(pinDragStart.screenX, pinDragEnd.screenX),
                  top: Math.min(pinDragStart.screenY, pinDragEnd.screenY),
                  width: Math.abs(pinDragEnd.screenX - pinDragStart.screenX),
                  height: Math.abs(pinDragEnd.screenY - pinDragStart.screenY),
                }}
              />
            )}
          </>
        )}

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
          currentLat={mapCenter.lat}
          currentLng={mapCenter.lng}
          canPaint={canPaint}
          statusStripHeight={statusStripHeight}
          onZoomIn={() => {
            if (!mapRef.current) return;
            mapRef.current.flyTo({
              center: mapRef.current.getCenter(),
              zoom: Z_SHOW_PAINTS,
              duration: 2500,
              easing: (t) => t < 0.5 
                ? 4 * t * t * t 
                : 1 - Math.pow(-2 * t + 2, 3) / 2
            });
          }}
          onColorSelect={setSelectedColor}
          onPaintToolChange={setPaintTool}
          onBrushSizeChange={setBrushSize}
          onInteractionModeChange={setInteractionMode}
          onPePerPixelChange={setPePerPixel}
          templateGuideColors={templateGuideColors}
          filterToGuideColors={activeTemplate?.mode === 'pixelGuide' && activeTemplate?.filterPaletteColors}
          actionDirection={actionDirection}
          onActionDirectionChange={setActionDirection}
        />

        {/* Pixel Info Panel (read-only) */}
        <PixelInspectorDrawer
          pixel={inspectedPixel}
          onClose={handleCloseInspector}
          currentUserId={user?.id}
          actionSelectionCount={pendingPixels.length + draftCount}
          onJumpToPixel={(targetX, targetY) => {
            const { lng, lat } = gridIntToLngLat(targetX, targetY);
            mapRef.current?.flyTo({ center: [lng, lat], zoom: 18, duration: 2000 });
            setUrlPosition(lat, lng, 18);
            setTimeout(() => {
              setInspectedPixel({ x: targetX, y: targetY });
            }, 2100);
          }}
        />

        {/* Inspector Panel for draft or pending pixels - Desktop only, NEVER show in HAND mode */}
        {canPaint && interactionMode === 'draw' && (pendingPixels.length > 0 || draftCount > 0) && !isMobile && (
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
onExcludeInvalid={handleExcludeInvalid}
                isValidating={isValidating} 
                isCommitting={isCommitting}
                isDraftMode={draftCount > 0}
                draftCount={draftCount}
                onUndoDraft={undoDraft}
                onClearDraft={clearDraft}
                progress={gameProgress}
                isStalled={isStalled}
                isSelectionChanged={isSelectionChangedAfterValidation}
                lastCommitFailed={lastCommitFailed}
                lastError={lastError}
                onRetryValidate={handleValidate}
              />
            </div>
          </div>
        )}

        {/* Mobile Action Dock - Non-modal, collapsible dock for mobile */}
        {canPaint && interactionMode === 'draw' && isMobile && (
          <MobileActionDock
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
            onExcludeInvalid={handleExcludeInvalid}
            clearValidation={clearValidation}
            isValidating={isValidating}
            isCommitting={isCommitting}
            isDraftMode={draftCount > 0}
            draftCount={draftCount}
            onUndoDraft={undoDraft}
            onClearDraft={clearDraft}
            progress={gameProgress}
            isStalled={isStalled}
            isSelectionChanged={isSelectionChangedAfterValidation}
            lastCommitFailed={lastCommitFailed}
            lastError={lastError}
            onRetryValidate={handleValidate}
            statusStripHeight={statusStripHeight}
          />
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
      <StatusStrip userId={user?.id} paintQueueSize={queueSize} isSpacePainting={isSpacePainting || isDrawingRef.current} isFlushing={isFlushing} draftCount={draftCount} onHeightChange={setStatusStripRef} />
      
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
      
      {/* Guided Tour Overlay */}
      <GuidedTour />
    </div>
  );
}
