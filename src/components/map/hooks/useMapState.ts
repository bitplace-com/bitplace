import { useState, useCallback } from 'react';

export type MapMode = 'paint' | 'defend' | 'attack' | 'reinforce';

export interface MapState {
  mode: MapMode;
  selectedColor: string;
  zoom: number;
  artOpacity: number;
}

export const Z_PAINT = 16;
export const MAX_ZOOM = 22;
export const MIN_ZOOM = 2;

const ART_OPACITY_KEY = 'bitplace-art-opacity';

const getInitialArtOpacity = (): number => {
  if (typeof window === 'undefined') return 1;
  const stored = localStorage.getItem(ART_OPACITY_KEY);
  return stored ? parseFloat(stored) : 1;
};

export const COLOR_PALETTE = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00',
  '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
  '#FFA500', '#800080', '#008000', '#000080',
  '#808080', '#C0C0C0', '#800000', '#008080',
  '#FFB6C1', '#90EE90', '#ADD8E6', '#DDA0DD',
  '#F0E68C', '#E6E6FA', '#98FB98', '#AFEEEE',
  '#DB7093', '#20B2AA', '#778899', '#B0C4DE',
  '#FFDAB9', '#D2B48C', '#BC8F8F', '#F5DEB3',
];

export function useMapState() {
  const [state, setState] = useState<MapState>({
    mode: 'paint',
    selectedColor: COLOR_PALETTE[2],
    zoom: 2,
    artOpacity: getInitialArtOpacity(),
  });

  const setMode = useCallback((mode: MapMode) => {
    setState((prev) => ({ ...prev, mode }));
  }, []);

  const setSelectedColor = useCallback((color: string) => {
    setState((prev) => ({ ...prev, selectedColor: color }));
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

  const canPaint = state.zoom >= Z_PAINT;

  return {
    ...state,
    setMode,
    setSelectedColor,
    setZoom,
    toggleArtOpacity,
    canPaint,
  };
}
