import { useState, useCallback } from 'react';
import { canInteractAtZoom } from '@/lib/pixelGrid';

export type MapMode = 'paint' | 'defend' | 'attack' | 'reinforce';
export type InteractionMode = 'drag' | 'draw';
export type PaintTool = 'BRUSH' | 'ERASER';

export interface MapState {
  mode: MapMode;
  selectedColor: string | null;
  paintTool: PaintTool;
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

export const COLOR_PALETTE = [
  '#000000', '#3c3c3c', '#787878', '#aaaaaa', '#d2d2d2', '#ffffff',
  '#600018', '#a50e1e', '#ed1c24', '#fa8072', '#e45c1a', '#ff7f27',
  '#f6aa09', '#f9dd3b', '#fffabc', '#9c8431', '#c5ad31', '#e8d45f',
  '#4a6b3a', '#5a944a', '#84c573', '#0eb968', '#13e67b', '#87ff5e',
  '#0c816e', '#10aea6', '#13e1be', '#0f799f', '#60f7f2', '#bbfaf2',
  '#28509e', '#4093e4', '#7dc7ff', '#4d31b8', '#6b50f6', '#99b1fb',
  '#4a4284', '#7a71c4', '#b5aef1', '#780c99', '#aa38b9', '#e09ff9',
  '#cb007a', '#ec1f80', '#f38da9', '#9b5249', '#d18078', '#fab6a4',
  '#684634', '#95682a', '#dba463', '#7b6352', '#9c846b', '#d6b594',
  '#d18051', '#f8b277', '#ffc5a5', '#6d643f', '#948c6b', '#cdc59e',
  '#333941', '#6d758d', '#b3b9d1',
];

export function useMapState() {
  const [state, setState] = useState<MapState>({
    mode: 'paint',
    selectedColor: COLOR_PALETTE[2],
    paintTool: 'BRUSH',
    zoom: 2,
    artOpacity: getInitialArtOpacity(),
    interactionMode: 'drag',
  });

  const setMode = useCallback((mode: MapMode) => {
    setState((prev) => ({ ...prev, mode }));
  }, []);

  const setSelectedColor = useCallback((color: string | null) => {
    setState((prev) => ({
      ...prev,
      selectedColor: color,
      paintTool: color === null ? 'ERASER' : 'BRUSH',
    }));
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
      selectedColor: tool === 'ERASER' ? null : prev.selectedColor,
    }));
  }, []);

  return {
    ...state,
    setMode,
    setSelectedColor,
    setZoom,
    toggleArtOpacity,
    setInteractionMode,
    setPaintTool,
    canPaint,
  };
}
