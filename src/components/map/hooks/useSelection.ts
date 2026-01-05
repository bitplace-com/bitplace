import { useState, useCallback } from 'react';

// Safety limit to prevent memory explosion from huge selections
export const MAX_SELECTION_PIXELS = 10000;

export interface SelectionBounds {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface SelectionState {
  isSelecting: boolean;
  bounds: SelectionBounds | null;
  pixelCount: number;
}

export function useSelection() {
  const [selection, setSelection] = useState<SelectionState>({
    isSelecting: false,
    bounds: null,
    pixelCount: 0,
  });

  const startSelection = useCallback((x: number, y: number) => {
    setSelection({
      isSelecting: true,
      bounds: { startX: x, startY: y, endX: x, endY: y },
      pixelCount: 1,
    });
  }, []);

  const updateSelection = useCallback((x: number, y: number) => {
    setSelection((prev) => {
      if (!prev.isSelecting || !prev.bounds) return prev;
      
      const minX = Math.min(prev.bounds.startX, x);
      const maxX = Math.max(prev.bounds.startX, x);
      const minY = Math.min(prev.bounds.startY, y);
      const maxY = Math.max(prev.bounds.startY, y);
      
      const pixelCount = (maxX - minX + 1) * (maxY - minY + 1);
      
      return {
        isSelecting: true,
        bounds: { ...prev.bounds, endX: x, endY: y },
        pixelCount,
      };
    });
  }, []);

  const endSelection = useCallback(() => {
    setSelection((prev) => ({
      ...prev,
      isSelecting: false,
    }));
  }, []);

  const clearSelection = useCallback(() => {
    setSelection({
      isSelecting: false,
      bounds: null,
      pixelCount: 0,
    });
  }, []);

  const getNormalizedBounds = useCallback((): SelectionBounds | null => {
    if (!selection.bounds) return null;
    
    const { startX, startY, endX, endY } = selection.bounds;
    return {
      startX: Math.min(startX, endX),
      startY: Math.min(startY, endY),
      endX: Math.max(startX, endX),
      endY: Math.max(startY, endY),
    };
  }, [selection.bounds]);

  const getSelectionCount = useCallback((): number => {
    const bounds = getNormalizedBounds();
    if (!bounds) return 0;
    return (bounds.endX - bounds.startX + 1) * (bounds.endY - bounds.startY + 1);
  }, [getNormalizedBounds]);

  const isSelectionTooLarge = useCallback((): boolean => {
    return getSelectionCount() > MAX_SELECTION_PIXELS;
  }, [getSelectionCount]);

  const getSelectedPixels = useCallback((): { x: number; y: number }[] => {
    const bounds = getNormalizedBounds();
    if (!bounds) return [];
    
    const count = getSelectionCount();
    if (count > MAX_SELECTION_PIXELS) {
      console.warn(`Selection too large: ${count} pixels, max is ${MAX_SELECTION_PIXELS}. Returning empty array.`);
      return [];
    }
    
    const pixels: { x: number; y: number }[] = [];
    for (let x = bounds.startX; x <= bounds.endX; x++) {
      for (let y = bounds.startY; y <= bounds.endY; y++) {
        pixels.push({ x, y });
      }
    }
    return pixels;
  }, [getNormalizedBounds, getSelectionCount]);

  return {
    selection,
    startSelection,
    updateSelection,
    endSelection,
    clearSelection,
    getNormalizedBounds,
    getSelectedPixels,
    getSelectionCount,
    isSelectionTooLarge,
  };
}
