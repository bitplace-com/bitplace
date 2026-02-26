import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FunctionsHttpError, FunctionsRelayError, FunctionsFetchError } from '@supabase/supabase-js';
import { useWallet } from '@/contexts/WalletContext';
import { toast } from 'sonner';
import { getAuthHeadersOrExpire } from '@/lib/authHelpers';
import { streamingInvoke } from '@/lib/streamingFetch';
import { hapticsEngine } from '@/lib/hapticsEngine';

// ── Exported warmup helper ──────────────────────────────────────────
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * Fire-and-forget PING to warm up a specific edge function + its DB pool.
 * Call this as early as possible (e.g. when entering PAINT mode or first draft pixel).
 */
export function warmupFunction(functionName: string): void {
  const headers = getAuthHeadersOrExpire();
  if (!headers || !SUPABASE_URL) return;

  fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json', apikey: ANON_KEY },
    body: JSON.stringify({ mode: 'PING' }),
  }).catch(() => {});
}

export type GameMode = 'PAINT' | 'DEFEND' | 'ATTACK' | 'REINFORCE' | 'ERASE' | 'WITHDRAW_DEF' | 'WITHDRAW_ATK' | 'WITHDRAW_REINFORCE';

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
  withdrawRefund?: number;
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
  pixels: { x: number; y: number; color?: string }[];
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
  isVirtualPe?: boolean;
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
const MAX_RETRIES = 1;           // 1 auto-retry for cold start recovery
const INITIAL_DELAY_MS = 2000;
const MIN_PIXELS_FOR_STREAMING = 50;
const MAX_STREAM_RETRIES = 1;    // At most 1 retry for cold start
// PROMPT 57: Increased timeouts for large operations (cold start can add 30-50s)
const BASE_TIMEOUT_MS = 45000; // 45s base timeout

// PROMPT 57: Chunking for very large operations to prevent timeout
const MAX_CHUNK_SIZE = 200; // Max pixels per chunk for sequential processing

// Calculate dynamic timeout based on pixel count
function getTimeoutForPixelCount(count: number): number {
  if (count >= 500) return 240000; // 240s (4 min) for 500 pixels
  if (count >= 400) return 180000; // 180s (3 min) for 400+ pixels
  if (count >= 200) return 120000; // 120s for 200+ pixels
  if (count >= 100) return 90000;  // 90s for 100+ pixels
  return BASE_TIMEOUT_MS;          // 45s for smaller operations
}

// Check if error is a timeout error
function isTimeoutError(error: Error | null): boolean {
  if (!error) return false;
  const msg = error.message.toLowerCase();
  return msg.includes('timed out') || 
         msg.includes('timeout') ||
         msg.includes('aborted') ||
         msg.includes('abort');
}

// Helper function to invoke edge functions with explicit timeout and external abort support
async function invokeWithTimeout<T>(
  functionName: string,
  options: { headers: Record<string, string>; body: unknown },
  timeoutMs: number = BASE_TIMEOUT_MS,
  externalController?: AbortController
): Promise<{ data: T | null; error: Error | null; aborted?: boolean }> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  
  // Use external controller if provided, otherwise create internal one
  const controller = externalController || new AbortController();
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
      // Check if aborted by external controller (user cancel) vs timeout
      const wasExternalAbort = externalController?.signal.aborted;
      return { 
        data: null, 
        error: wasExternalAbort ? new Error('Request cancelled') : new Error('Request timed out. Please try again.'),
        aborted: wasExternalAbort
      };
    }
    
    return { 
      data: null, 
      error: err instanceof Error ? err : new Error(String(err)) 
    };
  }
}

// Helper function to invoke edge functions with retry logic and dynamic timeout
async function invokeWithRetry<T>(
  functionName: string,
  options: { headers: Record<string, string>; body: unknown },
  pixelCount: number = 0,
  externalController?: AbortController
): Promise<{ data: T | null; error: Error | null; aborted?: boolean }> {
  const timeoutMs = getTimeoutForPixelCount(pixelCount);
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // Check if aborted before attempting
    if (externalController?.signal.aborted) {
      return { data: null, error: new Error('Request cancelled'), aborted: true };
    }
    
    if (attempt > 0) {
      const delay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
      console.log(`[invokeWithRetry] Retry attempt ${attempt} after ${delay}ms - warming up first...`);
      
      // PROMPT 58: On retry, send PING first to warm up cold database
      // PROMPT 59: Add 10s timeout to prevent PING from hanging indefinitely
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const pingController = new AbortController();
        const pingTimeout = setTimeout(() => pingController.abort(), 10000); // 10s max
        
        await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
          method: 'POST',
          signal: pingController.signal,
          headers: {
            ...options.headers,
            'Content-Type': 'application/json',
            'apikey': apiKey,
          },
          body: JSON.stringify({ mode: 'PING' }),
        });
        clearTimeout(pingTimeout);
        console.log(`[invokeWithRetry] PING warmup sent before retry`);
      } catch {
        // Ignore PING errors - it's just a warmup attempt
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    // Use invokeWithTimeout with dynamic timeout based on pixel count
    const result = await invokeWithTimeout<T>(functionName, options, timeoutMs, externalController);
    
    if (result.aborted) {
      return result;
    }
    
    if (!result.error) {
      return result;
    }
    
    lastError = result.error;
    
    // Only retry on timeout or network errors
    if (!isTimeoutError(result.error) && !(result.error instanceof FunctionsFetchError)) {
      return result;
    }
    
    console.log(`[invokeWithRetry] Timeout detected, will retry (attempt ${attempt + 1}/${MAX_RETRIES + 1})`);
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
  
  // AbortController ref for cancelling in-flight requests
  const abortControllerRef = useRef<AbortController | null>(null);

  const getAuthHeaders = useCallback(() => {
    return getAuthHeadersOrExpire();
  }, []);
  
  // Abort any in-flight validation/commit request
  const abortRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
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
      hapticsEngine.trigger('error');
      return null;
    }

    const headers = getAuthHeaders();
    if (!headers) {
      setLastError({
        code: 'SESSION_EXPIRED',
        message: 'Session expired. Please reconnect wallet.',
        canRetry: false,
      });
      hapticsEngine.trigger('error');
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

    // Cancel any previous request and create new AbortController
    abortRequest();
    abortControllerRef.current = new AbortController();

    setIsValidating(true);
    setInvalidPixels([]);
    setLastError(null);
    setIsStalled(false);
    setProgress({ processed: 0, total: deduplicatedPixels.length });

    // Fire-and-forget: pre-warm game-commit DB pool while validate runs
    warmupFunction('game-commit');

    // AWAIT warmup PING to game-validate (max 15s) - ensures DB connection pool is warm
    // If DB is already warm this completes in ~200ms; if cold it can take 10-15s
    // but then the actual validate call afterwards will be fast (~1-2s)
    try {
      const pingController = new AbortController();
      const pingTimeout = setTimeout(() => pingController.abort(), 15000);
      await fetch(`${SUPABASE_URL}/functions/v1/game-validate`, {
        method: 'POST',
        signal: pingController.signal,
        headers: { ...headers, 'Content-Type': 'application/json', apikey: ANON_KEY },
        body: JSON.stringify({ mode: 'PING' }),
      });
      clearTimeout(pingTimeout);
    } catch {
      // Ignore PING errors - proceed with actual validate regardless
    }

    try {
      let data: ValidateResult | null = null;
      let error: Error | null = null;
      let aborted = false;

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
        // PAINT or small operations: simple JSON invoke with dynamic timeout
        const result = await invokeWithRetry<ValidateResult>(
          'game-validate',
          { headers, body: { ...validatedParams, stream: false } },
          deduplicatedPixels.length,
          abortControllerRef.current || undefined
        );
        data = result.data;
        error = result.error;
        aborted = result.aborted || false;
      }

      // If request was aborted by user, exit silently
      if (aborted) {
        return null;
      }

      if (error) {
        // PROMPT 59: Improved network error detection for raw fetch errors
        const errorMessage = error.message?.toLowerCase() || '';
        const isNetworkError = 
          error instanceof FunctionsFetchError ||
          errorMessage.includes('failed to fetch') ||
          errorMessage.includes('network') ||
          errorMessage.includes('connection');
        const isTimeout = isTimeoutError(error);
        setLastError({
          code: isTimeout ? 'TIMEOUT' : isNetworkError ? 'NETWORK_ERROR' : 'REQUEST_FAILED',
          message: isTimeout 
            ? 'Request timed out. The server may be busy.'
            : isNetworkError 
              ? 'Network error. Please check your connection and retry.'
              : error.message || 'Validation failed',
          canRetry: true,
        });
        hapticsEngine.trigger('error');
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
            message: 'Maximum 300 pixels per paint',
            requestId: data.requestId,
            canRetry: false,
          });
          return null;
        }
        if (data.error === 'INSUFFICIENT_PE') {
          // Don't set error - let UI show insufficient PE state
        }
      }

      // PROMPT 58: Catch-all for unexpected response shapes (prevents silent failures)
      if (!data || typeof (data as ValidateResult).ok === 'undefined') {
        console.warn('[validate] Unexpected response shape:', data);
        setLastError({
          code: 'INVALID_RESPONSE',
          message: 'Server returned unexpected response. Please retry.',
          canRetry: true,
        });
        return null;
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
      hapticsEngine.trigger('error');
      return null;
    } finally {
      setIsValidating(false);
      setIsStalled(false);
      // Delay clearing progress so OperationProgress can flash 100%
      setTimeout(() => setProgress(null), 700);
    }
  }, [user?.id, getAuthHeaders, abortRequest]);

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
        // PAINT or small operations: simple JSON invoke with dynamic timeout
        const result = await invokeWithRetry<CommitResult>(
          'game-commit',
          { headers, body: { ...params, stream: false } },
          params.pixels.length
        );
        data = result.data;
        error = result.error;
      }

      if (error) {
        // PROMPT 59: Improved network error detection for raw fetch errors
        const errorMessage = error.message?.toLowerCase() || '';
        const isNetworkError = 
          error instanceof FunctionsFetchError ||
          errorMessage.includes('failed to fetch') ||
          errorMessage.includes('network') ||
          errorMessage.includes('connection');
        const isTimeout = isTimeoutError(error);
        setLastError({
          code: isTimeout ? 'TIMEOUT' : isNetworkError ? 'NETWORK_ERROR' : 'COMMIT_FAILED',
          message: isTimeout 
            ? 'Request timed out. The server may be busy.'
            : isNetworkError 
              ? 'Network error. Please check your connection and retry.'
              : (typeof error.message === 'string' ? error.message : JSON.stringify(error.message)) || 'Commit failed',
          canRetry: true,
        });
        hapticsEngine.trigger('error');
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
          hapticsEngine.trigger('error');
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
          hapticsEngine.trigger('error');
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
        hapticsEngine.trigger('validate_success');
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
      hapticsEngine.trigger('error');
      return null;
    } finally {
      setIsCommitting(false);
      setIsStalled(false);
      // Delay clearing progress so OperationProgress can flash 100%
      setTimeout(() => setProgress(null), 700);
    }
  }, [user?.id, getAuthHeaders]);

  const clearValidation = useCallback(() => {
    // Abort any in-flight request first
    abortRequest();
    setIsValidating(false);
    setIsCommitting(false);
    setProgress(null);
    setIsStalled(false);
    setValidationResult(null);
    setInvalidPixels([]);
    setLastError(null);
  }, [abortRequest]);

  return {
    validate,
    commit,
    validationResult,
    setValidationResult,
    invalidPixels,
    setInvalidPixels,
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
    case 'WITHDRAW_DEF': return 'Withdrew DEF from';
    case 'WITHDRAW_ATK': return 'Withdrew ATK from';
    case 'WITHDRAW_REINFORCE': return 'Withdrew stake from';
  }
}
