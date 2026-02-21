import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const BALANCE_REFRESH_MS = 60 * 1000; // 60 seconds

export interface BalanceState {
  bitBalance: number;
  bitUsdPrice: number;
  walletUsd: number;
  peTotal: number;
  lastSyncAt: Date | null;
  isRefreshing: boolean;
  error: string | null;
}

interface UseBalanceOptions {
  walletAddress: string | null;
  enabled?: boolean;
}

const defaultState: BalanceState = {
  bitBalance: 0,
  bitUsdPrice: 0,
  walletUsd: 0,
  peTotal: 0,
  lastSyncAt: null,
  isRefreshing: false,
  error: null,
};

// Debug logger
const balanceDebug = (stage: string, data?: unknown) => {
  const isDebug = 
    typeof window !== 'undefined' && (
      localStorage.getItem('bitplace_debug') === '1' ||
      window.location.search.includes('debug=1') ||
      import.meta.env.DEV
    );
  if (isDebug) {
    console.log(`[Balance:${stage}]`, data ?? '');
  }
};

export function useBalance({ walletAddress, enabled = true }: UseBalanceOptions) {
  const [state, setState] = useState<BalanceState>(defaultState);

  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Fetch balance from token-balance edge function (public, no auth required)
  const fetchBalance = useCallback(async (showRefreshing = true) => {
    if (!walletAddress || !enabled) return;

    if (showRefreshing) {
      setState(prev => ({ ...prev, isRefreshing: true, error: null }));
    }

    balanceDebug('fetch_start', { wallet: walletAddress.substring(0, 8) });

    try {
      const { data, error } = await supabase.functions.invoke('token-balance', {
        body: { wallet: walletAddress },
      });

      if (!isMountedRef.current) return;

      if (error) {
        balanceDebug('fetch_error', { error });
        setState(prev => ({ 
          ...prev, 
          isRefreshing: false, 
          error: 'Failed to fetch balance' 
        }));
        return;
      }

      if (!data?.ok) {
        balanceDebug('fetch_failed', { data });
        setState(prev => ({ 
          ...prev, 
          isRefreshing: false, 
          error: data?.message || 'Balance fetch failed' 
        }));
        return;
      }

      balanceDebug('fetch_success', {
        bitBalance: data.bitBalance,
        usdPrice: data.usdPrice,
        walletUsd: data.walletUsd,
        peTotal: data.peTotal,
      });

      setState({
        bitBalance: data.bitBalance || 0,
        bitUsdPrice: data.usdPrice || 0,
        walletUsd: data.walletUsd || 0,
        peTotal: data.peTotal || 0,
        lastSyncAt: new Date(),
        isRefreshing: false,
        error: null,
      });

    } catch (err) {
      if (!isMountedRef.current) return;
      
      balanceDebug('fetch_exception', { error: err });
      setState(prev => ({ 
        ...prev, 
        isRefreshing: false, 
        error: err instanceof Error ? err.message : 'Unknown error' 
      }));
    }
  }, [walletAddress, enabled]);

  // Manual refresh function
  const refresh = useCallback(() => {
    return fetchBalance(true);
  }, [fetchBalance]);

  // Setup auto-refresh timers
  useEffect(() => {
    isMountedRef.current = true;

    if (!walletAddress || !enabled) {
      setState(defaultState);
      return;
    }

    // Initial fetch
    fetchBalance(true);

    // Setup refresh interval
    refreshTimerRef.current = setInterval(() => {
      fetchBalance(false); // Silent refresh (no spinner)
    }, BALANCE_REFRESH_MS);

    return () => {
      isMountedRef.current = false;
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [walletAddress, enabled, fetchBalance]);

  return {
    ...state,
    refresh,
  };
}
