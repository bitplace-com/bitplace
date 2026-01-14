import { useEffect, useRef } from 'react';

const WARMUP_INTERVAL_MS = 4 * 60 * 1000; // 4 minutes
const CRITICAL_FUNCTIONS = ['game-validate', 'game-commit'];

/**
 * Hook to keep critical edge functions warm by periodically pinging their health endpoints.
 * This reduces cold start latency for frequently used functions.
 */
export function useEdgeFunctionWarmup() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) return;

    const warmupFunctions = async () => {
      const promises = CRITICAL_FUNCTIONS.map(async (fn) => {
        try {
          const url = `${supabaseUrl}/functions/v1/${fn}?health=1`;
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          if (response.ok) {
            console.debug(`[warmup] ${fn} ready`);
          }
        } catch {
          // Silently ignore warmup failures
        }
      });
      await Promise.all(promises);
    };

    // Initial warmup on mount
    warmupFunctions();

    // Periodic warmup
    intervalRef.current = setInterval(warmupFunctions, WARMUP_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
}
