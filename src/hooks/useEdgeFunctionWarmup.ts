import { useEffect, useRef, useCallback } from 'react';

const WARMUP_INTERVAL_MS = 4 * 60 * 1000; // 4 minutes
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
 * This primes the JWT verification code path for faster first requests.
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
        body: JSON.stringify({ mode: 'PING' }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (isDebug()) {
          console.debug(`[warmup] ${fn} PING ready (authMs: ${data.authMs}ms)`);
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
 * Anonymous warmup - keeps function instances warm without auth.
 * Uses GET ?health=1 endpoint which doesn't require authentication.
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
 * Hook to keep critical edge functions warm by periodically pinging their health endpoints.
 * This reduces cold start latency for frequently used functions.
 * 
 * Also exports warmupAuthenticatedFunctions for use after wallet authentication.
 */
export function useEdgeFunctionWarmup() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Anonymous warmup on mount + interval
  useEffect(() => {
    // Initial anonymous warmup on mount
    warmupAnonymous();

    // Periodic warmup to keep instances alive
    intervalRef.current = setInterval(warmupAnonymous, WARMUP_INTERVAL_MS);

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
