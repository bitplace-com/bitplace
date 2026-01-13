import { useState, useCallback } from 'react';
import { canInteractAtZoom } from '@/lib/pixelGrid';
import { ALL_COLORS } from '@/lib/palettes/basePaletteGrid';
export type MapMode = 'paint' | 'defend' | 'attack' | 'reinforce';
export type InteractionMode = 'drag' | 'draw';
export type PaintTool = 'BRUSH' | 'ERASER';
export type BrushSize = '1x' | '2x2';

export interface MapState {
  mode: MapMode;
  selectedColor: string | null;
  lastBrushColor: string;
  paintTool: PaintTool;
  brushSize: BrushSize;
  zoom: number;
  artOpacity: number;
  interactionMode: InteractionMode;
}

export const MIN_ZOOM = 2;
export const MAX_ZOOM = 22;

const ART_OPACITY_KEY = 'bitplace-art-opacity';

const getInitialArtOpacity = (): number => {
  if (typeof window === 'undefined') return 1;
  const stored = localStorage.getItem(ART_OPACITY_KEY);
  return stored ? parseFloat(stored) : 1;
};

// Re-export for compatibility
export const COLOR_PALETTE = ALL_COLORS;

export function useMapState() {
  const [state, setState] = useState<MapState>({
    mode: 'paint',
    selectedColor: null, // No default color - user must select
    lastBrushColor: ALL_COLORS[2], // Fallback for when user picks brush
    paintTool: 'BRUSH',
    brushSize: '1x',
    zoom: 2,
    artOpacity: getInitialArtOpacity(),
    interactionMode: 'drag',
  });

  const setMode = useCallback((mode: MapMode) => {
    setState((prev) => ({ ...prev, mode }));
  }, []);

  const setSelectedColor = useCallback((color: string | null) => {
    console.log('[useMapState] setSelectedColor called', { color });
    setState((prev) => {
      const newPaintTool: PaintTool = color === null ? 'ERASER' : 'BRUSH';
      const newInteractionMode: InteractionMode = color !== null ? 'draw' : prev.interactionMode;
      const newState: MapState = {
        ...prev,
        selectedColor: color,
        lastBrushColor: color !== null ? color : prev.lastBrushColor,
        paintTool: newPaintTool,
        // Atomic auto-switch: selecting a color enables draw mode
        interactionMode: newInteractionMode,
      };
      console.log('[useMapState] new state', { 
        selectedColor: newState.selectedColor, 
        interactionMode: newState.interactionMode,
        paintTool: newState.paintTool 
      });
      return newState;
    });
  }, []);

  const setZoom = useCallback((zoom: number) => {
    setState((prev) => ({ ...prev, zoom }));
  }, []);

  const toggleArtOpacity = useCallback(() => {
    setState((prev) => {
      const newOpacity = prev.artOpacity === 1 ? 0.35 : 1;
      localStorage.setItem(ART_OPACITY_KEY, String(newOpacity));
      return { ...prev, artOpacity: newOpacity };
    });
  }, []);

  const setInteractionMode = useCallback((interactionMode: InteractionMode) => {
    setState((prev) => ({ ...prev, interactionMode }));
  }, []);

  const canPaint = canInteractAtZoom(state.zoom);

  const setPaintTool = useCallback((tool: PaintTool) => {
    setState((prev) => ({
      ...prev,
      paintTool: tool,
      selectedColor: tool === 'ERASER' ? null : prev.lastBrushColor,
    }));
  }, []);

  const setBrushSize = useCallback((brushSize: BrushSize) => {
    setState((prev) => ({ ...prev, brushSize }));
  }, []);

  return {
    ...state,
    setMode,
    setSelectedColor,
    setZoom,
    toggleArtOpacity,
    setInteractionMode,
    setPaintTool,
    setBrushSize,
    canPaint,
  };
}
