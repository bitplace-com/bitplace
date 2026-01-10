import React, { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';

export type GameMode = 'PAINT' | 'ERASE' | 'DEFEND' | 'ATTACK' | 'REINFORCE';
export type PaintTool = 'HAND' | 'PAINT_1X' | 'PAINT_2X2' | 'ERASER';
export type InteractionMode = 'drag' | 'draw';

interface DraftPixel {
  color: string;
}

interface MapInteractionState {
  // Single focused pixel for inspection (read-only info)
  focusedPixel: { x: number; y: number } | null;
  
  // Pixels selected for an action (paint/defend/attack/reinforce/erase/withdraw)
  actionSelection: Set<string>; // "x:y" format
  
  // Current operation mode
  currentMode: GameMode;
  
  // Current tool
  currentTool: PaintTool;
  
  // Interaction mode (drag vs draw)
  interactionMode: InteractionMode;
  
  // Paint draft (only for PAINT, until validate/apply confirmed)
  draftPaint: Map<string, DraftPixel>; // "x:y" -> { color }
  
  // Currently selected color
  selectedColor: string | null;
  
  // PE per pixel for DEF/ATK/REINFORCE
  pePerPixel: number;
}

interface MapInteractionActions {
  // Focus management
  setFocusedPixel: (pixel: { x: number; y: number } | null) => void;
  
  // Action selection management
  addToActionSelection: (pixels: { x: number; y: number }[]) => void;
  removeFromActionSelection: (pixels: { x: number; y: number }[]) => void;
  setActionSelection: (pixels: { x: number; y: number }[]) => void;
  clearActionSelection: () => void;
  getActionSelectionPixels: () => { x: number; y: number }[];
  
  // Mode and tool management
  setCurrentMode: (mode: GameMode) => void;
  setCurrentTool: (tool: PaintTool) => void;
  setInteractionMode: (mode: InteractionMode) => void;
  
  // Draft paint management
  addToDraft: (x: number, y: number, color: string) => void;
  removeFromDraft: (x: number, y: number) => void;
  clearDraft: () => void;
  getDraftPixels: () => { x: number; y: number }[];
  getDraftColor: () => string | null;
  
  // Color management
  setSelectedColor: (color: string | null) => void;
  
  // PE management
  setPePerPixel: (value: number) => void;
  
  // Utility
  hasSelection: () => boolean;
  getEffectivePixels: () => { x: number; y: number }[];
}

type MapInteractionContextType = MapInteractionState & MapInteractionActions;

const MapInteractionContext = createContext<MapInteractionContextType | null>(null);

export function MapInteractionProvider({ children }: { children: ReactNode }) {
  const [focusedPixel, setFocusedPixel] = useState<{ x: number; y: number } | null>(null);
  const [actionSelection, setActionSelectionState] = useState<Set<string>>(new Set());
  const [currentMode, setCurrentMode] = useState<GameMode>('PAINT');
  const [currentTool, setCurrentTool] = useState<PaintTool>('HAND');
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('drag');
  const [draftPaint, setDraftPaint] = useState<Map<string, DraftPixel>>(new Map());
  const [selectedColor, setSelectedColor] = useState<string | null>('#ffffff');
  const [pePerPixel, setPePerPixel] = useState(1);

  // Helper to create pixel key
  const pixelKey = useCallback((x: number, y: number) => `${x}:${y}`, []);
  const parseKey = useCallback((key: string) => {
    const [x, y] = key.split(':').map(Number);
    return { x, y };
  }, []);

  // Action selection management
  const addToActionSelection = useCallback((pixels: { x: number; y: number }[]) => {
    setActionSelectionState(prev => {
      const next = new Set(prev);
      pixels.forEach(p => next.add(pixelKey(p.x, p.y)));
      return next;
    });
  }, [pixelKey]);

  const removeFromActionSelection = useCallback((pixels: { x: number; y: number }[]) => {
    setActionSelectionState(prev => {
      const next = new Set(prev);
      pixels.forEach(p => next.delete(pixelKey(p.x, p.y)));
      return next;
    });
  }, [pixelKey]);

  const setActionSelection = useCallback((pixels: { x: number; y: number }[]) => {
    const newSet = new Set<string>();
    pixels.forEach(p => newSet.add(pixelKey(p.x, p.y)));
    setActionSelectionState(newSet);
  }, [pixelKey]);

  const clearActionSelection = useCallback(() => {
    setActionSelectionState(new Set());
  }, []);

  const getActionSelectionPixels = useCallback((): { x: number; y: number }[] => {
    return Array.from(actionSelection).map(parseKey);
  }, [actionSelection, parseKey]);

  // Draft paint management
  const addToDraft = useCallback((x: number, y: number, color: string) => {
    setDraftPaint(prev => {
      const next = new Map(prev);
      next.set(pixelKey(x, y), { color });
      return next;
    });
  }, [pixelKey]);

  const removeFromDraft = useCallback((x: number, y: number) => {
    setDraftPaint(prev => {
      const next = new Map(prev);
      next.delete(pixelKey(x, y));
      return next;
    });
  }, [pixelKey]);

  const clearDraft = useCallback(() => {
    setDraftPaint(new Map());
  }, []);

  const getDraftPixels = useCallback((): { x: number; y: number }[] => {
    return Array.from(draftPaint.keys()).map(parseKey);
  }, [draftPaint, parseKey]);

  const getDraftColor = useCallback((): string | null => {
    if (draftPaint.size === 0) return null;
    const firstEntry = draftPaint.entries().next().value;
    return firstEntry ? firstEntry[1].color : null;
  }, [draftPaint]);

  // Utility functions
  const hasSelection = useCallback((): boolean => {
    return actionSelection.size > 0 || draftPaint.size > 0;
  }, [actionSelection.size, draftPaint.size]);

  const getEffectivePixels = useCallback((): { x: number; y: number }[] => {
    if (currentMode === 'PAINT' && draftPaint.size > 0) {
      return getDraftPixels();
    }
    return getActionSelectionPixels();
  }, [currentMode, draftPaint.size, getDraftPixels, getActionSelectionPixels]);

  const value = useMemo<MapInteractionContextType>(() => ({
    // State
    focusedPixel,
    actionSelection,
    currentMode,
    currentTool,
    interactionMode,
    draftPaint,
    selectedColor,
    pePerPixel,
    
    // Actions
    setFocusedPixel,
    addToActionSelection,
    removeFromActionSelection,
    setActionSelection,
    clearActionSelection,
    getActionSelectionPixels,
    setCurrentMode,
    setCurrentTool,
    setInteractionMode,
    addToDraft,
    removeFromDraft,
    clearDraft,
    getDraftPixels,
    getDraftColor,
    setSelectedColor,
    setPePerPixel,
    hasSelection,
    getEffectivePixels,
  }), [
    focusedPixel,
    actionSelection,
    currentMode,
    currentTool,
    interactionMode,
    draftPaint,
    selectedColor,
    pePerPixel,
    addToActionSelection,
    removeFromActionSelection,
    setActionSelection,
    clearActionSelection,
    getActionSelectionPixels,
    addToDraft,
    removeFromDraft,
    clearDraft,
    getDraftPixels,
    getDraftColor,
    hasSelection,
    getEffectivePixels,
  ]);

  return (
    <MapInteractionContext.Provider value={value}>
      {children}
    </MapInteractionContext.Provider>
  );
}

export function useMapInteraction() {
  const context = useContext(MapInteractionContext);
  if (!context) {
    throw new Error('useMapInteraction must be used within a MapInteractionProvider');
  }
  return context;
}

// Export a hook that returns just the state for components that only need to read
export function useMapInteractionState() {
  const context = useMapInteraction();
  return {
    focusedPixel: context.focusedPixel,
    actionSelection: context.actionSelection,
    currentMode: context.currentMode,
    currentTool: context.currentTool,
    interactionMode: context.interactionMode,
    draftPaint: context.draftPaint,
    selectedColor: context.selectedColor,
    pePerPixel: context.pePerPixel,
  };
}
