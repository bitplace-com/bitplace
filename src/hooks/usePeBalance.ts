import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ENERGY_ASSET, ENERGY_CONFIG } from '@/config/energy';

export interface PeBalance {
  total: number;
  locked: number;
  free: number;
  isLoading: boolean;
  // Rebalance status (owner stake)
  isUnderCollateralized: boolean;
  rebalanceActive: boolean;
  healthMultiplier: number;
  rebalanceEndsAt: Date | null;
  rebalanceTargetMultiplier: number | null;
  // Contribution collateral status
  contributionTotal: number;
  isContributionsUnderCollateralized: boolean;
  // Energy source info
  energyAsset: 'SOL' | 'BTP';
  nativeSymbol: string;
  nativeBalance: number;
  usdPrice: number;
  walletUsd: number;
  lastSyncAt: Date | null;
}

export function usePeBalance(userId: string | undefined): PeBalance {
  const [balance, setBalance] = useState<PeBalance>({
    total: 0,
    locked: 0,
    free: 0,
    isLoading: true,
    isUnderCollateralized: false,
    rebalanceActive: false,
    healthMultiplier: 1,
    rebalanceEndsAt: null,
    rebalanceTargetMultiplier: null,
    contributionTotal: 0,
    isContributionsUnderCollateralized: false,
    energyAsset: ENERGY_ASSET,
    nativeSymbol: ENERGY_CONFIG[ENERGY_ASSET].symbol,
    nativeBalance: 0,
    usdPrice: 0,
    walletUsd: 0,
    lastSyncAt: null,
  });

  const fetchBalance = useCallback(async () => {
    if (!userId) {
      setBalance({ 
        total: 0, locked: 0, free: 0, isLoading: false,
        isUnderCollateralized: false, rebalanceActive: false, 
        healthMultiplier: 1, rebalanceEndsAt: null, rebalanceTargetMultiplier: null,
        contributionTotal: 0, isContributionsUnderCollateralized: false,
        energyAsset: ENERGY_ASSET,
        nativeSymbol: ENERGY_CONFIG[ENERGY_ASSET].symbol,
        nativeBalance: 0,
        usdPrice: 0,
        walletUsd: 0,
        lastSyncAt: null,
      });
      return;
    }

    try {
      // Fetch user's pe_total_pe, rebalance status, and energy fields
      const { data: userData } = await supabase
        .from('users')
        .select('pe_total_pe, owner_health_multiplier, rebalance_active, rebalance_ends_at, rebalance_target_multiplier, energy_asset, native_symbol, native_balance, usd_price, wallet_usd, last_energy_sync_at')
        .eq('id', userId)
        .maybeSingle();

      const total = Number(userData?.pe_total_pe || 0);
      const healthMultiplier = Number(userData?.owner_health_multiplier || 1);
      const rebalanceActive = userData?.rebalance_active || false;
      const rebalanceEndsAt = userData?.rebalance_ends_at ? new Date(userData.rebalance_ends_at) : null;
      const rebalanceTargetMultiplier = userData?.rebalance_target_multiplier ?? null;
      
      // Energy fields
      const energyAsset = (userData?.energy_asset as 'SOL' | 'BTP') || ENERGY_ASSET;
      const nativeSymbol = userData?.native_symbol || ENERGY_CONFIG[ENERGY_ASSET].symbol;
      const nativeBalance = Number(userData?.native_balance || 0);
      const usdPrice = Number(userData?.usd_price || 0);
      const walletUsd = Number(userData?.wallet_usd || 0);
      const lastSyncAt = userData?.last_energy_sync_at ? new Date(userData.last_energy_sync_at) : null;

      // Fetch sum of owner_stake_pe for pixels owned by user
      const { data: pixelStakes } = await supabase
        .from('pixels')
        .select('owner_stake_pe')
        .eq('owner_user_id', userId);

      const pixelStakeTotal = pixelStakes?.reduce(
        (sum, p) => sum + Number(p.owner_stake_pe || 0),
        0
      ) || 0;

      // Fetch sum of contributions by user
      const { data: contributions } = await supabase
        .from('pixel_contributions')
        .select('amount_pe')
        .eq('user_id', userId);

      const contributionTotal = contributions?.reduce(
        (sum, c) => sum + Number(c.amount_pe || 0),
        0
      ) || 0;

      const locked = pixelStakeTotal + contributionTotal;
      const free = total - locked;
      const isUnderCollateralized = pixelStakeTotal > total;
      // DEF/ATK are under-collateralized if total PE < contribution total
      const isContributionsUnderCollateralized = total < contributionTotal;

      setBalance({
        total,
        locked,
        free: Math.max(0, free),
        isLoading: false,
        isUnderCollateralized,
        rebalanceActive,
        healthMultiplier,
        rebalanceEndsAt,
        rebalanceTargetMultiplier,
        contributionTotal,
        isContributionsUnderCollateralized,
        energyAsset,
        nativeSymbol,
        nativeBalance,
        usdPrice,
        walletUsd,
        lastSyncAt,
      });
    } catch (error) {
      console.error('Error fetching PE balance:', error);
      setBalance(prev => ({ ...prev, isLoading: false }));
    }
  }, [userId]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return balance;
}
