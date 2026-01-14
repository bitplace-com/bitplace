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
  requestId?: string;
  timings?: Record<string, number>;
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
  // PROMPT 55: Changed pixels for immediate UI update
  changedPixels?: Array<{
    x: number;
    y: number;
    color: string;
    owner_user_id: string;
    owner_stake_pe: number;
    def_total: number;
    atk_total: number;
  }>;
  error?: string;
  message?: string;
  contributionsPurged?: boolean;
  purgedContributionCount?: number;
  requestId?: string;
}

// Error interface for inline display
export interface ActionError {
  code: string;
  message: string;
  statusCode?: number;
  requestId?: string;
  timings?: Record<string, number>;
  canRetry: boolean;
}

// Retry configuration - PROMPT 44: reduced retries to avoid long waits
const MAX_RETRIES = 0;           // No auto-retry for small ops - let user manually retry
const INITIAL_DELAY_MS = 2000;
const MIN_PIXELS_FOR_STREAMING = 50;
const MAX_STREAM_RETRIES = 1;    // At most 1 retry for cold start
// PROMPT 53: Reduced timeout for PAINT (no streaming = faster response expected)
const INVOKE_TIMEOUT_MS = 45000; // 45s timeout

// Check if error is a timeout error
function isTimeoutError(error: Error | null): boolean {
  if (!error) return false;
  const msg = error.message.toLowerCase();
  return msg.includes('timed out') || 
         msg.includes('timeout') ||
         msg.includes('aborted') ||
         msg.includes('abort');
}

// Helper function to invoke edge functions with explicit timeout (for small operations)
async function invokeWithTimeout<T>(
  functionName: string,
  options: { headers: Record<string, string>; body: unknown },
  timeoutMs: number = INVOKE_TIMEOUT_MS
): Promise<{ data: T | null; error: Error | null }> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        ...options.headers,
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify(options.body),
    });
    
    clearTimeout(timeoutId);
    const data = await response.json();
    return { data: data as T, error: null };
  } catch (err) {
    clearTimeout(timeoutId);
    
    if (err instanceof Error && err.name === 'AbortError') {
      return { data: null, error: new Error('Request timed out. Please try again.') };
    }
    
    return { 
      data: null, 
      error: err instanceof Error ? err : new Error(String(err)) 
    };
  }
}

// Helper function to invoke edge functions with retry logic (for small operations)
async function invokeWithRetry<T>(
  functionName: string,
  options: { headers: Record<string, string>; body: unknown }
): Promise<{ data: T | null; error: Error | null }> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
      console.log(`[invokeWithRetry] Retry attempt ${attempt} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    // Use invokeWithTimeout instead of supabase.functions.invoke
    const result = await invokeWithTimeout<T>(functionName, options);
    
    if (!result.error) {
      return result;
    }
    
    lastError = result.error;
    
    // Only retry on timeout or network errors
    if (!isTimeoutError(result.error) && !(result.error instanceof FunctionsFetchError)) {
      return result;
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
  
  // Stall detection for progress
  const [isStalled, setIsStalled] = useState(false);
  
  // Error state for inline display (PROMPT 44)
  const [lastError, setLastError] = useState<ActionError | null>(null);

  const getAuthHeaders = useCallback(() => {
    return getAuthHeadersOrExpire();
  }, []);
  
  // Clear error when starting new operation
  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  const validate = useCallback(async (params: ValidateParams): Promise<ValidateResult | null> => {
    if (!user?.id) {
      setLastError({
        code: 'NOT_CONNECTED',
        message: 'Please connect wallet first',
        canRetry: false,
      });
      return null;
    }

    const headers = getAuthHeaders();
    if (!headers) {
      setLastError({
        code: 'SESSION_EXPIRED',
        message: 'Session expired. Please reconnect wallet.',
        canRetry: false,
      });
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
    setLastError(null);
    setIsStalled(false);
    setProgress({ processed: 0, total: deduplicatedPixels.length });

    try {
      let data: ValidateResult | null = null;
      let error: Error | null = null;

      // PROMPT 53: PAINT always uses simple JSON (no streaming) for reliability
      // Streaming is only for legacy modes (DEFEND, ATTACK, REINFORCE, ERASE) with many pixels
      const isPaintMode = params.mode === 'PAINT';
      const shouldStream = !isPaintMode && deduplicatedPixels.length >= MIN_PIXELS_FOR_STREAMING;

      if (shouldStream) {
        // Legacy modes with streaming
        let retryCount = 0;
        while (retryCount <= MAX_STREAM_RETRIES) {
          const result = await streamingInvoke<ValidateResult>(
            'game-validate',
            validatedParams,
            headers,
            { 
              onProgress: (processed, total) => {
                setProgress({ processed, total });
                setIsStalled(false);
              },
              onStall: () => setIsStalled(true),
            }
          );
          data = result.data;
          error = result.error;
          
          // If success or non-timeout error, break
          if (data || !isTimeoutError(error)) {
            break;
          }
          
          // Retry on timeout (cold start)
          retryCount++;
          if (retryCount <= MAX_STREAM_RETRIES) {
            console.log('[validate] Retrying after timeout (attempt', retryCount + 1, ')');
            setProgress({ processed: 0, total: deduplicatedPixels.length });
            setIsStalled(false);
          }
        }
      } else {
        // PAINT or small operations: simple JSON invoke
        const result = await invokeWithRetry<ValidateResult>('game-validate', {
          headers,
          body: { ...validatedParams, stream: false }, // Explicitly disable streaming
        });
        data = result.data;
        error = result.error;
      }

      if (error) {
        const isNetwork = error instanceof FunctionsFetchError;
        const isTimeout = isTimeoutError(error);
        setLastError({
          code: isTimeout ? 'TIMEOUT' : isNetwork ? 'NETWORK_ERROR' : 'REQUEST_FAILED',
          message: isTimeout 
            ? 'Request timed out. The server may be busy.'
            : isNetwork 
              ? 'Network error. Please check your connection.'
              : error.message || 'Validation failed',
          canRetry: true,
        });
        return null;
      }

      // Handle error responses in data
      if (data?.error) {
        if (data.error === 'RATE_LIMITED' || data.error === 'PAINT_COOLDOWN') {
          setLastError({
            code: data.error,
            message: data.message || 'Please wait before trying again.',
            requestId: data.requestId,
            canRetry: false,
          });
          return null;
        }
        if (data.error === 'MAX_PIXELS_EXCEEDED') {
          setLastError({
            code: 'MAX_PIXELS_EXCEEDED',
            message: 'Maximum 500 pixels per paint',
            requestId: data.requestId,
            canRetry: false,
          });
          return null;
        }
        if (data.error === 'INSUFFICIENT_PE') {
          // Don't set error - let UI show insufficient PE state
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
      setLastError({
        code: 'UNEXPECTED_ERROR',
        message: 'Validation error. Please try again.',
        canRetry: true,
      });
      return null;
    } finally {
      setIsValidating(false);
      setProgress(null);
      setIsStalled(false);
    }
  }, [user?.id, getAuthHeaders]);

  const commit = useCallback(async (params: CommitParams): Promise<CommitResult | null> => {
    if (!user?.id) {
      setLastError({
        code: 'NOT_CONNECTED',
        message: 'Please connect wallet first',
        canRetry: false,
      });
      return null;
    }

    const headers = getAuthHeaders();
    if (!headers) {
      setLastError({
        code: 'SESSION_EXPIRED',
        message: 'Session expired. Please reconnect wallet.',
        canRetry: false,
      });
      return null;
    }

    setIsCommitting(true);
    setLastError(null);
    setIsStalled(false);
    setProgress({ processed: 0, total: params.pixels.length });

    try {
      let data: CommitResult | null = null;
      let error: Error | null = null;

      // PROMPT 53: PAINT always uses simple JSON (no streaming) for reliability
      // Streaming is only for legacy modes (DEFEND, ATTACK, REINFORCE, ERASE) with many pixels
      const isPaintMode = params.mode === 'PAINT';
      const shouldStream = !isPaintMode && params.pixels.length >= MIN_PIXELS_FOR_STREAMING;

      if (shouldStream) {
        // Legacy modes with streaming
        let retryCount = 0;
        while (retryCount <= MAX_STREAM_RETRIES) {
          const result = await streamingInvoke<CommitResult>(
            'game-commit',
            params,
            headers,
            { 
              onProgress: (processed, total) => {
                setProgress({ processed, total });
                setIsStalled(false);
              },
              onStall: () => setIsStalled(true),
            }
          );
          data = result.data;
          error = result.error;
          
          // If success or non-timeout error, break
          if (data || !isTimeoutError(error)) {
            break;
          }
          
          // Retry on timeout (cold start)
          retryCount++;
          if (retryCount <= MAX_STREAM_RETRIES) {
            console.log('[commit] Retrying after timeout (attempt', retryCount + 1, ')');
            setProgress({ processed: 0, total: params.pixels.length });
            setIsStalled(false);
          }
        }
      } else {
        // PAINT or small operations: simple JSON invoke
        const result = await invokeWithRetry<CommitResult>('game-commit', {
          headers,
          body: { ...params, stream: false }, // Explicitly disable streaming
        });
        data = result.data;
        error = result.error;
      }

      if (error) {
        const isNetwork = error instanceof FunctionsFetchError;
        const isTimeout = isTimeoutError(error);
        setLastError({
          code: isTimeout ? 'TIMEOUT' : isNetwork ? 'NETWORK_ERROR' : 'COMMIT_FAILED',
          message: isTimeout 
            ? 'Request timed out. The server may be busy.'
            : isNetwork 
              ? 'Network error. Please check your connection.'
              : error.message || 'Commit failed',
          canRetry: true,
        });
        return null;
      }

      // Handle error responses
      if (data?.error) {
        if (data.error === 'RATE_LIMITED' || data.error === 'PAINT_COOLDOWN') {
          setLastError({
            code: data.error,
            message: data.message || 'Please wait before trying again.',
            requestId: data.requestId,
            canRetry: false,
          });
          return null;
        }
        if (data.error === 'STATE_CHANGED') {
          setLastError({
            code: 'STATE_CHANGED',
            message: 'Pixel state changed - please re-validate',
            requestId: data.requestId,
            canRetry: false,
          });
          setValidationResult(null);
          return null;
        }
        setLastError({
          code: data.error,
          message: data.message || 'Commit failed',
          requestId: data.requestId,
          canRetry: true,
        });
        return null;
      }

      if (data?.contributionsPurged) {
        toast.warning(`Your contributions were removed due to insufficient collateral`, { duration: 5000 });
      }

      if (data?.ok) {
        toast.success(`${formatMode(params.mode)} ${data.affectedPixels} pixel(s)`);
        setValidationResult(null);
        setInvalidPixels([]);
        setLastError(null);
      }
      
      return data as CommitResult;
    } catch (err) {
      setLastError({
        code: 'UNEXPECTED_ERROR',
        message: 'Commit error. Please try again.',
        canRetry: true,
      });
      return null;
    } finally {
      setIsCommitting(false);
      setProgress(null);
      setIsStalled(false);
    }
  }, [user?.id, getAuthHeaders]);

  const clearValidation = useCallback(() => {
    setValidationResult(null);
    setInvalidPixels([]);
    setLastError(null);
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
    isStalled,
    lastError,
    clearError,
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
