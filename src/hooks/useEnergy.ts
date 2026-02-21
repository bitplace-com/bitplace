import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ENERGY_ASSET, ENERGY_CONFIG, ENERGY_STALE_THRESHOLD_MS } from '@/config/energy';

export interface EnergyState {
  energyAsset: 'BIT';
  nativeSymbol: string;
  nativeBalance: number;
  usdPrice: number;
  walletUsd: number;
  peTotal: number;
  lastSyncAt: Date | null;
  isRefreshing: boolean;
  isStale: boolean;
}

interface EnergyRefreshResult {
  ok: boolean;
  stale?: boolean;
  waitSeconds?: number;
  energyAsset: string;
  nativeSymbol: string;
  nativeBalance: number;
  usdPrice: number;
  walletUsd: number;
  peTotal: number;
  lastSyncAt: string | null;
  error?: string;
  message?: string;
}

import { getAuthHeadersOrExpire } from '@/lib/authHelpers';

export function useEnergy(userId: string | undefined) {
  const [state, setState] = useState<EnergyState>({
    energyAsset: ENERGY_ASSET,
    nativeSymbol: ENERGY_CONFIG[ENERGY_ASSET].symbol,
    nativeBalance: 0,
    usdPrice: 0,
    walletUsd: 0,
    peTotal: 0,
    lastSyncAt: null,
    isRefreshing: false,
    isStale: true,
  });

  // Check if energy is stale (older than threshold)
  const checkIsStale = useCallback((lastSyncAt: Date | null): boolean => {
    if (!lastSyncAt) return true;
    return Date.now() - lastSyncAt.getTime() > ENERGY_STALE_THRESHOLD_MS;
  }, []);

  // Refresh energy from edge function
  const refresh = useCallback(async (): Promise<EnergyRefreshResult | null> => {
    if (!userId) return null;

    const headers = getAuthHeadersOrExpire();
    if (!headers) return null;

    setState(prev => ({ ...prev, isRefreshing: true }));

    try {
      const { data, error } = await supabase.functions.invoke<EnergyRefreshResult>('energy-refresh', {
        headers,
      });

      if (error) {
        console.error('[useEnergy] Refresh error:', error);
        setState(prev => ({ ...prev, isRefreshing: false }));
        return null;
      }

      if (!data) {
        setState(prev => ({ ...prev, isRefreshing: false }));
        return null;
      }

      const lastSyncAt = data.lastSyncAt ? new Date(data.lastSyncAt) : null;

      setState({
        energyAsset: 'BIT',
        nativeSymbol: data.nativeSymbol || ENERGY_CONFIG[ENERGY_ASSET].symbol,
        nativeBalance: data.nativeBalance || 0,
        usdPrice: data.usdPrice || 0,
        walletUsd: data.walletUsd || 0,
        peTotal: data.peTotal || 0,
        lastSyncAt,
        isRefreshing: false,
        isStale: data.stale ?? checkIsStale(lastSyncAt),
      });

      return data;
    } catch (err) {
      console.error('[useEnergy] Refresh exception:', err);
      setState(prev => ({ ...prev, isRefreshing: false }));
      return null;
    }
  }, [userId, checkIsStale]);

  // Auto-refresh if stale before action
  const ensureFresh = useCallback(async (): Promise<boolean> => {
    if (!state.isStale) return true;
    const result = await refresh();
    return result?.ok ?? false;
  }, [state.isStale, refresh]);

  // Update stale status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setState(prev => ({
        ...prev,
        isStale: checkIsStale(prev.lastSyncAt),
      }));
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [checkIsStale]);

  // Load initial state from user data
  const loadFromUser = useCallback((userData: {
    energy_asset?: string;
    native_symbol?: string;
    native_balance?: number;
    usd_price?: number;
    wallet_usd?: number;
    pe_total_pe?: number;
    last_energy_sync_at?: string | null;
  }) => {
    const lastSyncAt = userData.last_energy_sync_at ? new Date(userData.last_energy_sync_at) : null;
    setState({
      energyAsset: 'BIT',
      nativeSymbol: userData.native_symbol || ENERGY_CONFIG[ENERGY_ASSET].symbol,
      nativeBalance: Number(userData.native_balance) || 0,
      usdPrice: Number(userData.usd_price) || 0,
      walletUsd: Number(userData.wallet_usd) || 0,
      peTotal: Number(userData.pe_total_pe) || 0,
      lastSyncAt,
      isRefreshing: false,
      isStale: checkIsStale(lastSyncAt),
    });
  }, [checkIsStale]);

  return {
    ...state,
    refresh,
    ensureFresh,
    loadFromUser,
  };
}
