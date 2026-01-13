import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FunctionsHttpError, FunctionsRelayError, FunctionsFetchError } from '@supabase/supabase-js';
import { useWallet } from '@/contexts/WalletContext';
import { toast } from 'sonner';
import { getAuthHeadersOrExpire } from '@/lib/authHelpers';
import { streamingInvoke } from '@/lib/streamingFetch';

export type GameMode = 'PAINT' | 'DEFEND' | 'ATTACK' | 'REINFORCE' | 'ERASE';

export interface InvalidPixel {
  x: number;
  y: number;
  reason: string;
}

export interface Breakdown {
  pixelCount: number;
  ownedByUser: number;
  ownedByOthers: number;
  empty: number;
  pePerType: { [key: string]: number };
}

export interface ValidateResult {
  ok: boolean;
  partialValid?: boolean;
  validPixelCount?: number;
  requiredPeTotal: number;
  snapshotHash: string;
  invalidPixels: InvalidPixel[];
  breakdown: Breakdown;
  availablePe: number;
  unlockPeTotal?: number;
  error?: string;
  message?: string;
  contributionsPurged?: boolean;
  purgedContributionCount?: number;
}

export interface ValidateParams {
  mode: GameMode;
  pixels: { x: number; y: number }[];
  color?: string;
  pePerPixel?: number;
}

export interface CommitParams extends ValidateParams {
  snapshotHash: string;
}

export interface CommitResult {
  ok: boolean;
  affectedPixels?: number;
  xpEarned?: number;
  eventId?: number;
  peStatus?: {
    total: number;
    used: number;
    available: number;
    pixelStakeTotal?: number;
    contributionTotal?: number;
  };
  paintCooldownUntil?: string;
  paintCooldownSeconds?: number;
  error?: string;
  message?: string;
  contributionsPurged?: boolean;
  purgedContributionCount?: number;
}

// Retry configuration
const MAX_RETRIES = 2;
const INITIAL_DELAY_MS = 1000;
const MIN_PIXELS_FOR_STREAMING = 50;

// Helper function to invoke edge functions with retry logic (for small operations)
async function invokeWithRetry<T>(
  functionName: string,
  options: { headers: Record<string, string>; body: unknown }
): Promise<{ data: T | null; error: Error | null }> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    try {
      const result = await supabase.functions.invoke<T>(functionName, options);
      
      if (!result.error) {
        return result;
      }
      
      if (result.error instanceof FunctionsFetchError) {
        lastError = result.error;
        continue;
      }
      
      return result;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }
  
  return { data: null, error: lastError };
}

export function useGameActions() {
  const { user } = useWallet();
  const [validationResult, setValidationResult] = useState<ValidateResult | null>(null);
  const [invalidPixels, setInvalidPixels] = useState<InvalidPixel[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  
  // Real progress tracking from SSE stream
  const [progress, setProgress] = useState<{ processed: number; total: number } | null>(null);

  const getAuthHeaders = useCallback(() => {
    return getAuthHeadersOrExpire();
  }, []);

  const validate = useCallback(async (params: ValidateParams): Promise<ValidateResult | null> => {
    if (!user?.id) {
      toast.error('Please connect wallet first');
      return null;
    }

    const headers = getAuthHeaders();
    if (!headers) {
      toast.error('Session expired. Please reconnect wallet.');
      return null;
    }

    const pixelSet = new Set<string>();
    const deduplicatedPixels = params.pixels.filter(p => {
      const key = `${Math.floor(p.x)}:${Math.floor(p.y)}`;
      if (pixelSet.has(key)) return false;
      pixelSet.add(key);
      return true;
    }).map(p => ({ x: Math.floor(p.x), y: Math.floor(p.y) }));

    const validatedParams = { ...params, pixels: deduplicatedPixels };

    setIsValidating(true);
    setInvalidPixels([]);
    setProgress({ processed: 0, total: deduplicatedPixels.length });

    try {
      let data: ValidateResult | null = null;
      let error: Error | null = null;

      // Use streaming for large operations
      if (deduplicatedPixels.length >= MIN_PIXELS_FOR_STREAMING) {
        const result = await streamingInvoke<ValidateResult>(
          'game-validate',
          validatedParams,
          headers,
          { onProgress: (processed, total) => setProgress({ processed, total }) }
        );
        data = result.data;
        error = result.error;
      } else {
        const result = await invokeWithRetry<ValidateResult>('game-validate', {
          headers,
          body: validatedParams,
        });
        data = result.data;
        error = result.error;
      }

      if (error) {
        if (error instanceof FunctionsFetchError) {
          toast.error('Network error. Please check your connection.');
          return null;
        }
        toast.error(error.message || 'Validation failed');
        return null;
      }

      // Handle error responses in data
      if (data?.error) {
        if (data.error === 'RATE_LIMITED' || data.error === 'PAINT_COOLDOWN') {
          toast.warning(data.message || 'Please wait before trying again.');
          return null;
        }
        if (data.error === 'MAX_PIXELS_EXCEEDED') {
          toast.error(`Maximum 500 pixels per paint`);
          return null;
        }
        if (data.error === 'INSUFFICIENT_PE') {
          toast.error(`Insufficient PE: need ${data.requiredPeTotal}, have ${data.availablePe}`);
        }
      }

      const result = data as ValidateResult;
      setValidationResult(result);
      
      if (result.contributionsPurged) {
        toast.warning(`Your contributions were removed due to insufficient collateral`, { duration: 5000 });
      }
      
      if (!result.ok && result.invalidPixels?.length > 0) {
        setInvalidPixels(result.invalidPixels);
      }

      return result;
    } catch (err) {
      toast.error('Validation error. Please try again.');
      return null;
    } finally {
      setIsValidating(false);
      setProgress(null);
    }
  }, [user?.id, getAuthHeaders]);

  const commit = useCallback(async (params: CommitParams): Promise<CommitResult | null> => {
    if (!user?.id) {
      toast.error('Please connect wallet first');
      return null;
    }

    const headers = getAuthHeaders();
    if (!headers) {
      toast.error('Session expired. Please reconnect wallet.');
      return null;
    }

    setIsCommitting(true);
    setProgress({ processed: 0, total: params.pixels.length });

    try {
      let data: CommitResult | null = null;
      let error: Error | null = null;

      // Use streaming for large operations
      if (params.pixels.length >= MIN_PIXELS_FOR_STREAMING) {
        const result = await streamingInvoke<CommitResult>(
          'game-commit',
          params,
          headers,
          { onProgress: (processed, total) => setProgress({ processed, total }) }
        );
        data = result.data;
        error = result.error;
      } else {
        const result = await invokeWithRetry<CommitResult>('game-commit', {
          headers,
          body: params,
        });
        data = result.data;
        error = result.error;
      }

      if (error) {
        if (error instanceof FunctionsFetchError) {
          toast.error('Network error. Please check your connection.');
          return null;
        }
        toast.error(error.message || 'Commit failed');
        return null;
      }

      // Handle error responses
      if (data?.error) {
        if (data.error === 'RATE_LIMITED' || data.error === 'PAINT_COOLDOWN') {
          toast.warning(data.message || 'Please wait before trying again.');
          return null;
        }
        if (data.error === 'STATE_CHANGED') {
          toast.error('Pixel state changed - please re-validate');
          setValidationResult(null);
          return null;
        }
        toast.error(data.message || 'Commit failed');
        return null;
      }

      if (data?.contributionsPurged) {
        toast.warning(`Your contributions were removed due to insufficient collateral`, { duration: 5000 });
      }

      if (data?.ok) {
        toast.success(`${formatMode(params.mode)} ${data.affectedPixels} pixel(s)`);
        setValidationResult(null);
        setInvalidPixels([]);
      }
      
      return data as CommitResult;
    } catch (err) {
      toast.error('Commit error. Please try again.');
      return null;
    } finally {
      setIsCommitting(false);
      setProgress(null);
    }
  }, [user?.id, getAuthHeaders]);

  const clearValidation = useCallback(() => {
    setValidationResult(null);
    setInvalidPixels([]);
  }, []);

  return {
    validate,
    commit,
    validationResult,
    invalidPixels,
    isValidating,
    isCommitting,
    clearValidation,
    progress,
  };
}

function formatMode(mode: GameMode): string {
  switch (mode) {
    case 'PAINT': return 'Painted';
    case 'DEFEND': return 'Defended';
    case 'ATTACK': return 'Attacked';
    case 'REINFORCE': return 'Reinforced';
    case 'ERASE': return 'Erased';
  }
}
