import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';

// Max pixels per paint action - exported for UI display
export const PAINT_MAX_PIXELS = 500;
const MAX_DRAFT = PAINT_MAX_PIXELS;

export interface DraftPixel {
  x: number;
  y: number;
  color: string;
  createdAt: number;
}

interface UseDraftPaintResult {
  draft: Map<string, DraftPixel>;
  draftCount: number;
  draftColor: string | null;
  isAtLimit: boolean;
  draftDirty: boolean;
  
  addToDraft: (x: number, y: number, color: string) => boolean;
  removeFromDraft: (x: number, y: number) => void;
  removeInvalidFromDraft: (keys: string[]) => void;
  undoLast: () => void;
  clearDraft: () => void;
  getDraftPixels: () => { x: number; y: number }[];
  setDraftDirty: (dirty: boolean) => void;
}

export function useDraftPaint(): UseDraftPaintResult {
  const [draft, setDraft] = useState<Map<string, DraftPixel>>(new Map());
  const [draftDirty, setDraftDirty] = useState(false);
  
  // Track order for undo
  const draftOrderRef = useRef<string[]>([]);
  // Track if we've shown the limit toast
  const hasShownLimitToast = useRef(false);

  const draftCount = draft.size;
  const isAtLimit = draftCount >= MAX_DRAFT;
  
  // Get the color from the first draft pixel (all should be same color in a session)
  const draftColor = draft.size > 0 ? Array.from(draft.values())[0]?.color ?? null : null;

  const addToDraft = useCallback((x: number, y: number, color: string): boolean => {
    // Auth check
    const token = localStorage.getItem('bitplace_session_token');
    if (!token) {
      toast.info('Sign in to paint');
      return false;
    }
    
    const key = `${x}:${y}`;
    
    // Check if already in draft
    if (draft.has(key)) {
      return false;
    }
    
    // Check limit
    if (draft.size >= MAX_DRAFT) {
      if (!hasShownLimitToast.current) {
        toast.warning(`Max ${MAX_DRAFT} pixels per paint`);
        hasShownLimitToast.current = true;
      }
      return false;
    }
    
    setDraft(prev => {
      const next = new Map(prev);
      next.set(key, { x, y, color, createdAt: Date.now() });
      return next;
    });
    
    draftOrderRef.current.push(key);
    setDraftDirty(true);
    
    return true;
  }, [draft]);

  const removeFromDraft = useCallback((x: number, y: number) => {
    const key = `${x}:${y}`;
    setDraft(prev => {
      if (!prev.has(key)) return prev;
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
    draftOrderRef.current = draftOrderRef.current.filter(k => k !== key);
    setDraftDirty(true);
    // Reset limit toast if we're below limit again
    if (draft.size - 1 < MAX_DRAFT) {
      hasShownLimitToast.current = false;
    }
  }, [draft.size]);

  const removeInvalidFromDraft = useCallback((keys: string[]) => {
    setDraft(prev => {
      const next = new Map(prev);
      keys.forEach(key => next.delete(key));
      return next;
    });
    draftOrderRef.current = draftOrderRef.current.filter(k => !keys.includes(k));
    setDraftDirty(true);
    if (draft.size - keys.length < MAX_DRAFT) {
      hasShownLimitToast.current = false;
    }
  }, [draft.size]);

  const undoLast = useCallback(() => {
    if (draftOrderRef.current.length === 0) return;
    
    const lastKey = draftOrderRef.current.pop();
    if (!lastKey) return;
    
    setDraft(prev => {
      const next = new Map(prev);
      next.delete(lastKey);
      return next;
    });
    setDraftDirty(true);
    
    if (draft.size - 1 < MAX_DRAFT) {
      hasShownLimitToast.current = false;
    }
  }, [draft.size]);

  const clearDraft = useCallback(() => {
    setDraft(new Map());
    draftOrderRef.current = [];
    setDraftDirty(false);
    hasShownLimitToast.current = false;
  }, []);

  const getDraftPixels = useCallback((): { x: number; y: number }[] => {
    return Array.from(draft.values()).map(({ x, y }) => ({ x, y }));
  }, [draft]);

  return {
    draft,
    draftCount,
    draftColor,
    isAtLimit,
    draftDirty,
    addToDraft,
    removeFromDraft,
    removeInvalidFromDraft,
    undoLast,
    clearDraft,
    getDraftPixels,
    setDraftDirty,
  };
}
