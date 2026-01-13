import { useState, useCallback, useRef, useMemo } from 'react';
import { computePixelHash } from '@/lib/pixelHash';
import type { ValidateResult } from '@/hooks/useGameActions';

/**
 * Paint State Machine States:
 * - IDLE: No draft pixels, no pending action
 * - DRAFT: User is drawing, pixels in draft but not validated
 * - VALIDATING: Calling game-validate, frozen payload created
 * - VALIDATED: Validation passed, frozen payload ready for commit
 * - COMMITTING: Calling game-commit with frozen payload
 */
export type PaintState = 'IDLE' | 'DRAFT' | 'VALIDATING' | 'VALIDATED' | 'COMMITTING';

export interface FrozenPayload {
  pixels: { x: number; y: number }[];
  color: string;
  pixelHash: string;
  validatedAt: number;
  snapshotHash: string;
  requiredPe: number;
  availablePe: number;
}

export interface UsePaintStateMachineResult {
  // Current state
  state: PaintState;
  frozenPayload: FrozenPayload | null;
  isSelectionChanged: boolean;
  lastCommitFailed: boolean;
  
  // State transitions
  enterDraft: () => void;
  freeze: (pixels: { x: number; y: number }[], color: string) => FrozenPayload;
  startValidation: () => void;
  completeValidation: (result: ValidateResult) => void;
  failValidation: () => void;
  startCommit: () => void;
  completeCommit: () => void;
  failCommit: () => void;
  invalidate: () => void;
  reset: () => void;
  
  // Helpers
  checkSelectionChanged: (currentPixels: { x: number; y: number }[]) => boolean;
}

export function usePaintStateMachine(): UsePaintStateMachineResult {
  const [state, setState] = useState<PaintState>('IDLE');
  const [frozenPayload, setFrozenPayload] = useState<FrozenPayload | null>(null);
  const [lastCommitFailed, setLastCommitFailed] = useState(false);
  
  // Track if selection changed after validation
  const frozenHashRef = useRef<string | null>(null);

  // Check if current selection differs from frozen payload
  const checkSelectionChanged = useCallback((currentPixels: { x: number; y: number }[]): boolean => {
    if (!frozenHashRef.current || state !== 'VALIDATED') return false;
    const currentHash = computePixelHash(currentPixels);
    return currentHash !== frozenHashRef.current;
  }, [state]);

  // Memoized selection changed flag (requires external current pixels)
  const isSelectionChanged = useMemo(() => {
    // This is computed externally by the component using checkSelectionChanged
    return false;
  }, []);

  // Enter DRAFT state when user starts drawing
  const enterDraft = useCallback(() => {
    if (state === 'IDLE') {
      setState('DRAFT');
      setLastCommitFailed(false);
    }
  }, [state]);

  // Freeze current draft into immutable payload
  const freeze = useCallback((
    pixels: { x: number; y: number }[],
    color: string
  ): FrozenPayload => {
    const hash = computePixelHash(pixels);
    frozenHashRef.current = hash;
    
    const payload: FrozenPayload = {
      pixels: [...pixels], // Immutable copy
      color,
      pixelHash: hash,
      validatedAt: 0,
      snapshotHash: '',
      requiredPe: 0,
      availablePe: 0,
    };
    
    setFrozenPayload(payload);
    return payload;
  }, []);

  // Transition: DRAFT → VALIDATING
  const startValidation = useCallback(() => {
    setState('VALIDATING');
    setLastCommitFailed(false);
  }, []);

  // Transition: VALIDATING → VALIDATED (success)
  const completeValidation = useCallback((result: ValidateResult) => {
    if (!result.ok && !result.partialValid) {
      // Full failure - stay in DRAFT
      setState('DRAFT');
      return;
    }
    
    setFrozenPayload(prev => prev ? {
      ...prev,
      snapshotHash: result.snapshotHash,
      validatedAt: Date.now(),
      requiredPe: result.requiredPeTotal,
      availablePe: result.availablePe,
    } : null);
    
    setState('VALIDATED');
  }, []);

  // Transition: VALIDATING → DRAFT (failure)
  const failValidation = useCallback(() => {
    setState('DRAFT');
    // Keep frozen payload for retry reference, but clear hash
    frozenHashRef.current = null;
  }, []);

  // Transition: VALIDATED → COMMITTING
  const startCommit = useCallback(() => {
    setState('COMMITTING');
    setLastCommitFailed(false);
  }, []);

  // Transition: COMMITTING → IDLE (success)
  const completeCommit = useCallback(() => {
    setState('IDLE');
    setFrozenPayload(null);
    frozenHashRef.current = null;
    setLastCommitFailed(false);
  }, []);

  // Transition: COMMITTING → VALIDATED (failure, allows retry)
  const failCommit = useCallback(() => {
    setState('VALIDATED');
    setLastCommitFailed(true);
  }, []);

  // Force invalidation (when selection changes post-validation)
  const invalidate = useCallback(() => {
    setState('DRAFT');
    setFrozenPayload(null);
    frozenHashRef.current = null;
    setLastCommitFailed(false);
  }, []);

  // Full reset to IDLE
  const reset = useCallback(() => {
    setState('IDLE');
    setFrozenPayload(null);
    frozenHashRef.current = null;
    setLastCommitFailed(false);
  }, []);

  return {
    state,
    frozenPayload,
    isSelectionChanged,
    lastCommitFailed,
    enterDraft,
    freeze,
    startValidation,
    completeValidation,
    failValidation,
    startCommit,
    completeCommit,
    failCommit,
    invalidate,
    reset,
    checkSelectionChanged,
  };
}
