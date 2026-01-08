import { useState, useCallback, useRef } from 'react';

export const MAX_BRUSH_SELECTION = 10000;

interface BrushSelectionState {
  pixels: Set<string>;
  isBrushSelecting: boolean;
  lastHoveredKey: string | null;
}

export function useBrushSelection() {
  const [state, setState] = useState<BrushSelectionState>({
    pixels: new Set(),
    isBrushSelecting: false,
    lastHoveredKey: null,
  });
  
  const hasShownLimitToast = useRef(false);

  const startBrushSelection = useCallback((x: number, y: number) => {
    const key = `${x}:${y}`;
    hasShownLimitToast.current = false;
    setState({
      pixels: new Set([key]),
      isBrushSelecting: true,
      lastHoveredKey: key,
    });
  }, []);

  const addToBrushSelection = useCallback((x: number, y: number): { added: boolean; atLimit: boolean } => {
    const key = `${x}:${y}`;
    let added = false;
    let atLimit = false;
    
    setState(prev => {
      if (prev.lastHoveredKey === key) return prev;
      if (prev.pixels.size >= MAX_BRUSH_SELECTION) {
        atLimit = true;
        return prev;
      }
      if (prev.pixels.has(key)) {
        return { ...prev, lastHoveredKey: key };
      }
      const next = new Set(prev.pixels);
      next.add(key);
      added = true;
      return { ...prev, pixels: next, lastHoveredKey: key };
    });
    
    return { added, atLimit };
  }, []);

  const endBrushSelection = useCallback(() => {
    setState(prev => ({ ...prev, isBrushSelecting: false }));
  }, []);

  const clearBrushSelection = useCallback(() => {
    hasShownLimitToast.current = false;
    setState({ pixels: new Set(), isBrushSelecting: false, lastHoveredKey: null });
  }, []);

  const getSelectedPixels = useCallback((): { x: number; y: number }[] => {
    return Array.from(state.pixels).map(key => {
      const [x, y] = key.split(':').map(Number);
      return { x, y };
    });
  }, [state.pixels]);

  const setFromRectSelection = useCallback((pixels: { x: number; y: number }[]) => {
    const newSet = new Set<string>();
    for (const p of pixels) {
      if (newSet.size >= MAX_BRUSH_SELECTION) break;
      newSet.add(`${p.x}:${p.y}`);
    }
    setState(prev => ({ ...prev, pixels: newSet }));
  }, []);

  return {
    brushSelection: state,
    selectionCount: state.pixels.size,
    isSelectionAtLimit: state.pixels.size >= MAX_BRUSH_SELECTION,
    hasShownLimitToast,
    startBrushSelection,
    addToBrushSelection,
    endBrushSelection,
    clearBrushSelection,
    getSelectedPixels,
    setFromRectSelection,
  };
}
