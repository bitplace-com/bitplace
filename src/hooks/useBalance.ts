import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY_CLUSTER = 'bitplace_sol_cluster';
const PRICE_REFRESH_MS = 30 * 1000; // 30 seconds
const BALANCE_REFRESH_MS = 60 * 1000; // 60 seconds

export interface BalanceState {
  solBalance: number;
  solUsdPrice: number;
  walletUsd: number;
  peTotal: number;
  cluster: 'mainnet' | 'devnet' | null;
  lastSyncAt: Date | null;
  isRefreshing: boolean;
  error: string | null;
}

interface UseBalanceOptions {
  walletAddress: string | null;
  enabled?: boolean;
}

const defaultState: BalanceState = {
  solBalance: 0,
  solUsdPrice: 0,
  walletUsd: 0,
  peTotal: 0,
  cluster: null,
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
  const [state, setState] = useState<BalanceState>(() => {
    // Load cached cluster from localStorage
    const cachedCluster = typeof window !== 'undefined' 
      ? localStorage.getItem(STORAGE_KEY_CLUSTER) as 'mainnet' | 'devnet' | null
      : null;
    return { ...defaultState, cluster: cachedCluster };
  });

  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Fetch balance from sol-balance edge function (public, no auth required)
  const fetchBalance = useCallback(async (showRefreshing = true) => {
    if (!walletAddress || !enabled) return;

    if (showRefreshing) {
      setState(prev => ({ ...prev, isRefreshing: true, error: null }));
    }

    balanceDebug('fetch_start', { wallet: walletAddress.substring(0, 8) });

    try {
      const { data, error } = await supabase.functions.invoke('sol-balance', {
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

      const newCluster = data.cluster as 'mainnet' | 'devnet';
      
      // Cache cluster in localStorage
      localStorage.setItem(STORAGE_KEY_CLUSTER, newCluster);

      balanceDebug('fetch_success', {
        solBalance: data.solBalance,
        usdPrice: data.usdPrice,
        walletUsd: data.walletUsd,
        peTotal: data.peTotal,
        cluster: newCluster,
      });

      setState({
        solBalance: data.solBalance || 0,
        solUsdPrice: data.usdPrice || 0,
        walletUsd: data.walletUsd || 0,
        peTotal: data.peTotal || 0,
        cluster: newCluster,
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
      setState(prev => ({ ...defaultState, cluster: prev.cluster }));
      return;
    }

    // Initial fetch
    fetchBalance(true);

    // Setup refresh interval (balance every 60s, price is cached in edge function)
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
