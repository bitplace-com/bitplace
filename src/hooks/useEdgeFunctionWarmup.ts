import { useEffect, useRef, useCallback } from 'react';
import { getAuthHeadersOrExpire } from '@/lib/authHelpers';

// OPTIMIZATION: Reduced to 2 minutes to prevent DB cold start
const WARMUP_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
const CRITICAL_FUNCTIONS = ['game-validate', 'game-commit'];

// Debug logger
const isDebug = () => 
  typeof window !== 'undefined' && (
    localStorage.getItem('bitplace_debug') === '1' ||
    window.location.search.includes('debug=1') ||
    import.meta.env.DEV
  );

/**
 * Warm up edge functions with an authenticated PING request.
 * PROMPT 57: Now includes DB connection pool warmup to prevent cold start delays.
 * This primes both JWT verification AND database connection for faster first requests.
 */
export async function warmupAuthenticatedFunctions(token: string): Promise<void> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl || !token) return;

  const promises = CRITICAL_FUNCTIONS.map(async (fn) => {
    try {
      const url = `${supabaseUrl}/functions/v1/${fn}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        // PING mode now warms up DB connection pool too
        body: JSON.stringify({ mode: 'PING' }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (isDebug()) {
          console.debug(`[warmup] ${fn} PING ready (auth=${data.authMs}ms, db=${data.dbMs}ms)`);
        }
      } else {
        if (isDebug()) {
          console.warn(`[warmup] ${fn} PING failed: ${response.status}`);
        }
      }
    } catch (err) {
      if (isDebug()) {
        console.warn(`[warmup] ${fn} PING error:`, err);
      }
    }
  });
  
  await Promise.all(promises);
}

/**
 * Warmup with current auth token from localStorage.
 * This is used for periodic interval warmup when user is authenticated.
 */
async function warmupWithCurrentAuth(): Promise<void> {
  const headers = getAuthHeadersOrExpire();
  if (!headers) return; // Not authenticated
  
  const token = headers['Authorization']?.replace('Bearer ', '');
  if (!token) return;
  
  await warmupAuthenticatedFunctions(token);
}

/**
 * Anonymous warmup - keeps function instances warm without auth.
 * Uses GET ?health=1 endpoint which doesn't require authentication.
 * NOTE: This is less effective than authenticated warmup because it doesn't warm DB.
 */
async function warmupAnonymous(): Promise<void> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) return;

  const promises = CRITICAL_FUNCTIONS.map(async (fn) => {
    try {
      const url = `${supabaseUrl}/functions/v1/${fn}?health=1`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.ok && isDebug()) {
        console.debug(`[warmup] ${fn} health ready`);
      }
    } catch {
      // Silently ignore warmup failures
    }
  });
  
  await Promise.all(promises);
}

/**
 * Hook to keep critical edge functions warm by periodically pinging.
 * OPTIMIZATION: Now uses authenticated warmup when possible to also warm DB connection.
 */
export function useEdgeFunctionWarmup() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Initial warmup on mount - try authenticated first, fallback to anonymous
    const initialWarmup = async () => {
      const headers = getAuthHeadersOrExpire();
      if (headers) {
        await warmupWithCurrentAuth();
      } else {
        await warmupAnonymous();
      }
    };
    
    initialWarmup();

    // Periodic warmup every 3 minutes - prefer authenticated to warm DB
    intervalRef.current = setInterval(async () => {
      const headers = getAuthHeadersOrExpire();
      if (headers) {
        // User is authenticated - do full warmup including DB
        await warmupWithCurrentAuth();
      } else {
        // No auth - just keep function instances warm
        await warmupAnonymous();
      }
    }, WARMUP_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
}

/**
 * Hook that returns the warmup function for authenticated calls.
 * Call this after wallet becomes AUTHENTICATED.
 */
export function useAuthenticatedWarmup() {
  return useCallback((token: string) => {
    warmupAuthenticatedFunctions(token).catch(err => {
      if (isDebug()) {
        console.warn('[warmup] authenticated warmup failed:', err);
      }
    });
  }, []);
}

/**
 * Trigger pre-warmup when user starts selecting pixels.
 * This masks the cold start delay by warming up during pixel selection.
 */
export function triggerPredictiveWarmup(): void {
  const headers = getAuthHeadersOrExpire();
  if (!headers) return;
  
  const token = headers['Authorization']?.replace('Bearer ', '');
  if (!token) return;
  
  // Fire and forget - don't await
  warmupAuthenticatedFunctions(token).catch(() => {
    // Silently ignore errors in predictive warmup
  });
  
  if (isDebug()) {
    console.debug('[warmup] predictive warmup triggered');
  }
}
