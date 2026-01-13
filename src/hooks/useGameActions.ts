import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FunctionsHttpError, FunctionsRelayError, FunctionsFetchError } from '@supabase/supabase-js';
import { useWallet } from '@/contexts/WalletContext';
import { toast } from 'sonner';
import { getAuthHeadersOrExpire } from '@/lib/authHelpers';

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
  error?: string;
  message?: string;
  contributionsPurged?: boolean;
  purgedContributionCount?: number;
}

// Retry configuration
const MAX_RETRIES = 2;
const INITIAL_DELAY_MS = 1000;

// Helper function to invoke edge functions with retry logic
async function invokeWithRetry<T>(
  functionName: string,
  options: { headers: Record<string, string>; body: unknown }
): Promise<{ data: T | null; error: Error | null }> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // Wait before retry (exponential backoff)
    if (attempt > 0) {
      const delay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
      console.log(`[invokeWithRetry] Retry attempt ${attempt} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    try {
      const result = await supabase.functions.invoke<T>(functionName, options);
      
      // If no error or non-retryable error, return immediately
      if (!result.error) {
        return result;
      }
      
      // Only retry on network/fetch errors
      if (result.error instanceof FunctionsFetchError) {
        console.warn(`[invokeWithRetry] Network error on attempt ${attempt + 1}:`, result.error.message);
        lastError = result.error;
        continue; // Retry
      }
      
      // Non-retryable error (HTTP errors, relay errors, etc.)
      return result;
    } catch (err) {
      console.error(`[invokeWithRetry] Exception on attempt ${attempt + 1}:`, err);
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }
  
  // All retries exhausted
  return { data: null, error: lastError };
}

export function useGameActions() {
  const { user } = useWallet();
  const [validationResult, setValidationResult] = useState<ValidateResult | null>(null);
  const [invalidPixels, setInvalidPixels] = useState<InvalidPixel[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  
  // Operation progress tracking
  const [operationStartTime, setOperationStartTime] = useState<number | null>(null);
  const [operationPixelCount, setOperationPixelCount] = useState(0);

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

    // Deduplicate and validate pixels
    const pixelSet = new Set<string>();
    const deduplicatedPixels = params.pixels.filter(p => {
      const key = `${Math.floor(p.x)}:${Math.floor(p.y)}`;
      if (pixelSet.has(key)) return false;
      pixelSet.add(key);
      return true;
    }).map(p => ({ x: Math.floor(p.x), y: Math.floor(p.y) }));

    const validatedParams = { ...params, pixels: deduplicatedPixels };

    console.log('[useGameActions] Validate request:', {
      mode: validatedParams.mode,
      pixelCount: validatedParams.pixels.length,
      sampleCoords: validatedParams.pixels.slice(0, 3),
      color: validatedParams.color,
      pePerPixel: validatedParams.pePerPixel,
    });

    setIsValidating(true);
    setInvalidPixels([]);
    setOperationStartTime(Date.now());
    setOperationPixelCount(deduplicatedPixels.length);

    // Show progress toast for large operations
    const showProgress = deduplicatedPixels.length > 150;
    let progressToastId: string | number | undefined;
    if (showProgress) {
      progressToastId = toast.loading(`Validating ${deduplicatedPixels.length} pixels...`);
    }

    try {
      const { data, error } = await invokeWithRetry<ValidateResult>('game-validate', {
        headers,
        body: validatedParams,
      });

      // Dismiss progress toast
      if (progressToastId) {
        toast.dismiss(progressToastId);
      }

      if (error) {
        console.error('[useGameActions] Validate error object:', error);
        
        let errorMessage = 'Validation failed';
        let errorStatus: number | undefined;
        let errorBody: unknown = null;
        
        // Handle network/fetch errors with user-friendly message
        if (error instanceof FunctionsFetchError) {
          toast.error('Network error. Please check your connection and try again.');
          return null;
        }
        
        // Extract real error from FunctionsHttpError context
        if (error instanceof FunctionsHttpError) {
          errorStatus = error.context.status;
          
          // Handle gateway timeout (edge function timeout)
          if (errorStatus === 504) {
            toast.error('Server timeout. Try selecting fewer pixels.');
            return null;
          }
          
          try {
            errorBody = await error.context.json();
            errorMessage = (errorBody as { message?: string; error?: string }).message || 
                          (errorBody as { error?: string }).error || 'Validation failed';
          } catch {
            try {
              const text = await error.context.text();
              errorMessage = text || `Validation failed (status ${error.context.status})`;
            } catch {
              errorMessage = `Validation failed (status ${error.context.status})`;
            }
          }
          
          console.error('[useGameActions] Validate HTTP error:', {
            status: errorStatus,
            body: errorBody,
            requestPayload: { mode: params.mode, pixelCount: params.pixels.length, sampleCoords: params.pixels.slice(0, 3) },
          });
        } else if (error instanceof FunctionsRelayError) {
          errorMessage = `Network error: ${error.message}`;
          console.error('[useGameActions] Validate relay error:', error.message);
        } else {
          // Fallback for other error types
          errorMessage = error.message || 'Validation failed';
          console.error('[useGameActions] Validate unknown error:', error);
        }
        
        // Handle specific error types
        const errorBodyTyped = errorBody as { error?: string; message?: string } | null;
        if (errorBodyTyped?.error === 'RATE_LIMITED' || errorStatus === 429) {
          toast.warning(errorBodyTyped?.message || 'Too many requests. Please wait.');
          return null;
        }
        
        toast.error(errorMessage);
        return null;
      }

      // Check if response indicates rate limiting
      if (data?.error === 'RATE_LIMITED') {
        toast.warning(data.message || 'Too many requests. Please wait a moment.');
        return null;
      }

      const result = data as ValidateResult;
      setValidationResult(result);
      
      // Show toast if contributions were purged due to under-collateralization
      if (result.contributionsPurged) {
        toast.warning(
          `Your DEF/ATK contributions (${result.purgedContributionCount}) were removed due to insufficient collateral`,
          { duration: 5000 }
        );
      }
      
      if (!result.ok) {
        setInvalidPixels(result.invalidPixels || []);
        if (result.error === 'INSUFFICIENT_PE') {
          toast.error(`Insufficient PE: need ${result.requiredPeTotal}, have ${result.availablePe}`);
        } else if (result.invalidPixels?.length > 0) {
          const firstReason = result.invalidPixels[0].reason;
          toast.error(`${result.invalidPixels.length} invalid pixel(s): ${formatReason(firstReason)}`);
        }
      }

      return result;
    } catch (err) {
      // Dismiss progress toast on error
      if (progressToastId) {
        toast.dismiss(progressToastId);
      }
      console.error('[useGameActions] Validate exception:', err);
      toast.error('Validation error. Please try again.');
      return null;
    } finally {
      setIsValidating(false);
      setOperationStartTime(null);
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
    setOperationStartTime(Date.now());
    setOperationPixelCount(params.pixels.length);

    // Show progress toast for large operations
    const showProgress = params.pixels.length > 150;
    let progressToastId: string | number | undefined;
    if (showProgress) {
      progressToastId = toast.loading(`Committing ${params.pixels.length} pixels...`);
    }

    try {
      const { data, error } = await invokeWithRetry<CommitResult>('game-commit', {
        headers,
        body: params,
      });

      // Dismiss progress toast
      if (progressToastId) {
        toast.dismiss(progressToastId);
      }

      if (error) {
        console.error('[useGameActions] Commit error object:', error);
        
        let errorMessage = 'Commit failed';
        let errorStatus: number | undefined;
        let errorBody: unknown = null;
        
        // Handle network/fetch errors with user-friendly message
        if (error instanceof FunctionsFetchError) {
          toast.error('Network error. Please check your connection and try again.');
          return null;
        }
        
        // Extract real error from FunctionsHttpError context
        if (error instanceof FunctionsHttpError) {
          errorStatus = error.context.status;
          
          // Handle gateway timeout (edge function timeout)
          if (errorStatus === 504) {
            toast.error('Server timeout. Try selecting fewer pixels.');
            return null;
          }
          
          try {
            errorBody = await error.context.json();
            errorMessage = (errorBody as { message?: string; error?: string }).message || 
                          (errorBody as { error?: string }).error || 'Commit failed';
          } catch {
            try {
              const text = await error.context.text();
              errorMessage = text || `Commit failed (status ${error.context.status})`;
            } catch {
              errorMessage = `Commit failed (status ${error.context.status})`;
            }
          }
          
          console.error('[useGameActions] Commit HTTP error:', {
            status: errorStatus,
            body: errorBody,
            requestPayload: { mode: params.mode, pixelCount: params.pixels.length },
          });
        } else if (error instanceof FunctionsRelayError) {
          errorMessage = `Network error: ${error.message}`;
          console.error('[useGameActions] Commit relay error:', error.message);
        } else {
          errorMessage = error.message || 'Commit failed';
          console.error('[useGameActions] Commit unknown error:', error);
        }
        
        const errorBodyTyped = errorBody as { error?: string; message?: string } | null;
        
        // Handle rate limit
        if (errorBodyTyped?.error === 'RATE_LIMITED' || errorStatus === 429) {
          toast.warning(errorBodyTyped?.message || 'Action too fast. Please wait a moment before trying again.');
          return null;
        }
        
        // Handle state changed (409) - prompt user to re-validate
        if (errorBodyTyped?.error === 'STATE_CHANGED' || errorStatus === 409) {
          toast.error('Pixel state changed - please re-validate and try again');
          setValidationResult(null);
          return null;
        }
        
        toast.error(errorMessage);
        return null;
      }

      // Check if response indicates rate limiting
      if (data?.error === 'RATE_LIMITED') {
        toast.warning(data.message || 'Action too fast. Please wait a moment before trying again.');
        return null;
      }

      // Show toast if contributions were purged due to under-collateralization
      if (data?.contributionsPurged) {
        toast.warning(
          `Your DEF/ATK contributions (${data.purgedContributionCount}) were removed due to insufficient collateral`,
          { duration: 5000 }
        );
      }

      if (!data?.ok) {
        if (data?.error === 'STATE_CHANGED') {
          toast.error('Pixel state changed - please try again');
        } else if (data?.error === 'CONTRIBUTIONS_PURGED') {
          // Already showed toast above
        } else {
          toast.error(data?.message || 'Commit failed');
        }
        return null;
      }

      toast.success(`${formatMode(params.mode)} ${data.affectedPixels} pixel(s)`);
      setValidationResult(null);
      setInvalidPixels([]);
      return data as CommitResult;
    } catch (err) {
      // Dismiss progress toast on error
      if (progressToastId) {
        toast.dismiss(progressToastId);
      }
      console.error('[useGameActions] Commit exception:', err);
      toast.error('Commit error. Please try again.');
      return null;
    } finally {
      setIsCommitting(false);
      setOperationStartTime(null);
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
    // Progress tracking
    operationStartTime,
    operationPixelCount,
  };
}

function formatReason(reason: string): string {
  switch (reason) {
    case 'NOT_OWNER': return 'You must own these pixels';
    case 'IS_OWNER': return 'Cannot target your own pixels';
    case 'OPPOSITE_SIDE': return 'Already have opposite contribution';
    case 'EMPTY_PIXEL': return 'Pixel must be owned';
    default: return reason;
  }
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
