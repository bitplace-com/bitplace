import { useEffect, useRef, useCallback } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { lngLatToGridInt } from '@/lib/pixelGrid';

export type PointerInputType = 'mouse' | 'touch' | 'pen';

interface PointerCallbacks {
  onPointerStart: (x: number, y: number, type: PointerInputType) => void;
  onPointerMove: (x: number, y: number, type: PointerInputType) => void;
  onPointerEnd: (x: number, y: number, type: PointerInputType, wasTap: boolean) => void;
}

interface UsePointerInteractionOptions {
  callbacks: PointerCallbacks;
  enabled: boolean;
  isHandMode: boolean;
}

/**
 * Unified pointer event handling for touch/pen/mouse input on map.
 * Provides setPointerCapture for reliable drag tracking on touch devices.
 */
export function usePointerInteraction(
  containerRef: React.RefObject<HTMLElement>,
  map: MapLibreMap | null,
  options: UsePointerInteractionOptions
) {
  const { callbacks, enabled, isHandMode } = options;
  
  // Track active pointer to prevent multi-touch confusion
  const activePointerIdRef = useRef<number | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number; screenX: number; screenY: number; time: number } | null>(null);
  const lastGridPosRef = useRef<{ x: number; y: number } | null>(null);
  const isTouchDeviceRef = useRef(false);
  
  // Store callbacks in refs to avoid stale closures
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  // Convert screen coords to grid coords using map.unproject
  const screenToGrid = useCallback((screenX: number, screenY: number) => {
    if (!map) return null;
    const container = containerRef.current;
    if (!container) return null;
    
    const rect = container.getBoundingClientRect();
    const relX = screenX - rect.left;
    const relY = screenY - rect.top;
    
    const lngLat = map.unproject([relX, relY]);
    return lngLatToGridInt(lngLat.lng, lngLat.lat);
  }, [map, containerRef]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !map || !enabled) return;

    const handlePointerDown = (e: PointerEvent) => {
      // Ignore if we already have an active pointer (no multi-touch)
      if (activePointerIdRef.current !== null) return;
      
      const pointerType = e.pointerType as PointerInputType;
      const isTouchOrPen = pointerType === 'touch' || pointerType === 'pen';
      
      if (isTouchOrPen) {
        isTouchDeviceRef.current = true;
      }
      
      // Only capture touch/pen events (mouse uses existing MapLibre handlers)
      if (!isTouchOrPen) return;
      
      // HAND mode: let map handle pan/zoom, don't capture
      if (isHandMode) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      activePointerIdRef.current = e.pointerId;
      
      // Capture pointer for reliable tracking during drag
      try {
        container.setPointerCapture(e.pointerId);
      } catch (err) {
        // Ignore - some browsers don't support setPointerCapture
      }
      
      const gridPos = screenToGrid(e.clientX, e.clientY);
      if (!gridPos) return;
      
      pointerStartRef.current = {
        x: gridPos.x,
        y: gridPos.y,
        screenX: e.clientX,
        screenY: e.clientY,
        time: Date.now(),
      };
      lastGridPosRef.current = gridPos;
      
      callbacksRef.current.onPointerStart(gridPos.x, gridPos.y, pointerType);
    };

    const handlePointerMove = (e: PointerEvent) => {
      // Only track the active pointer
      if (activePointerIdRef.current !== e.pointerId) return;
      
      const pointerType = e.pointerType as PointerInputType;
      const isTouchOrPen = pointerType === 'touch' || pointerType === 'pen';
      if (!isTouchOrPen) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      const gridPos = screenToGrid(e.clientX, e.clientY);
      if (!gridPos) return;
      
      // Only fire if grid position changed (prevents duplicate calls on same pixel)
      const last = lastGridPosRef.current;
      if (last && last.x === gridPos.x && last.y === gridPos.y) return;
      
      lastGridPosRef.current = gridPos;
      callbacksRef.current.onPointerMove(gridPos.x, gridPos.y, pointerType);
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (activePointerIdRef.current !== e.pointerId) return;
      
      const pointerType = e.pointerType as PointerInputType;
      const isTouchOrPen = pointerType === 'touch' || pointerType === 'pen';
      if (!isTouchOrPen) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      // Release pointer capture
      try {
        container.releasePointerCapture(e.pointerId);
      } catch (err) {
        // Ignore
      }
      
      const gridPos = screenToGrid(e.clientX, e.clientY);
      const start = pointerStartRef.current;
      
      // Determine if this was a tap (minimal movement, short duration)
      let wasTap = false;
      if (start && gridPos) {
        const dragDistance = Math.sqrt(
          Math.pow(e.clientX - start.screenX, 2) +
          Math.pow(e.clientY - start.screenY, 2)
        );
        const duration = Date.now() - start.time;
        // Tap: < 10px movement and < 300ms
        wasTap = dragDistance < 10 && duration < 300;
      }
      
      // Reset state
      activePointerIdRef.current = null;
      pointerStartRef.current = null;
      lastGridPosRef.current = null;
      
      if (gridPos) {
        callbacksRef.current.onPointerEnd(gridPos.x, gridPos.y, pointerType, wasTap);
      }
    };

    const handlePointerCancel = (e: PointerEvent) => {
      if (activePointerIdRef.current !== e.pointerId) return;
      
      // Release capture on cancel
      try {
        container.releasePointerCapture(e.pointerId);
      } catch (err) {
        // Ignore
      }
      
      // Reset state without firing end callback
      activePointerIdRef.current = null;
      pointerStartRef.current = null;
      lastGridPosRef.current = null;
    };

    // Add event listeners with { passive: false } to prevent default on touch
    container.addEventListener('pointerdown', handlePointerDown, { passive: false });
    container.addEventListener('pointermove', handlePointerMove, { passive: false });
    container.addEventListener('pointerup', handlePointerUp, { passive: false });
    container.addEventListener('pointercancel', handlePointerCancel, { passive: false });

    return () => {
      container.removeEventListener('pointerdown', handlePointerDown);
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerup', handlePointerUp);
      container.removeEventListener('pointercancel', handlePointerCancel);
    };
  }, [containerRef, map, enabled, isHandMode, screenToGrid]);

  return {
    isTouchDevice: isTouchDeviceRef.current,
  };
}
