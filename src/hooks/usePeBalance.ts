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
  energyAsset: 'SOL' | 'BIT';
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
      const { data: userData } = await supabase
        .from('public_pixel_owner_info' as any)
        .select('id, owner_health_multiplier, rebalance_active, rebalance_ends_at, rebalance_target_multiplier')
        .eq('id', userId)
        .maybeSingle();

      const healthMultiplier = Number((userData as any)?.owner_health_multiplier || 1);
      const rebalanceActive = (userData as any)?.rebalance_active || false;
      const rebalanceEndsAt = (userData as any)?.rebalance_ends_at ? new Date((userData as any).rebalance_ends_at) : null;
      const rebalanceTargetMultiplier = (userData as any)?.rebalance_target_multiplier ?? null;
      
      const total = 0; // Will be set by WalletContext
      const energyAsset = ENERGY_ASSET;
      const nativeSymbol = ENERGY_CONFIG[ENERGY_ASSET].symbol;
      const nativeBalance = 0;
      const usdPrice = 0;
      const walletUsd = 0;
      const lastSyncAt: Date | null = null;

      const { data: pixelStakes } = await supabase
        .from('pixels')
        .select('owner_stake_pe')
        .eq('owner_user_id', userId);

      const pixelStakeTotal = pixelStakes?.reduce(
        (sum, p) => sum + Number(p.owner_stake_pe || 0),
        0
      ) || 0;

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
