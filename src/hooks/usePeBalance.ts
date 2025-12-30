import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  });

  const fetchBalance = useCallback(async () => {
    if (!userId) {
      setBalance({ 
        total: 0, locked: 0, free: 0, isLoading: false,
        isUnderCollateralized: false, rebalanceActive: false, 
        healthMultiplier: 1, rebalanceEndsAt: null, rebalanceTargetMultiplier: null,
        contributionTotal: 0, isContributionsUnderCollateralized: false,
      });
      return;
    }

    try {
      // Fetch user's pe_total_pe and rebalance status
      const { data: userData } = await supabase
        .from('users')
        .select('pe_total_pe, owner_health_multiplier, rebalance_active, rebalance_ends_at, rebalance_target_multiplier')
        .eq('id', userId)
        .maybeSingle();

      const total = Number(userData?.pe_total_pe || 0);
      const healthMultiplier = Number(userData?.owner_health_multiplier || 1);
      const rebalanceActive = userData?.rebalance_active || false;
      const rebalanceEndsAt = userData?.rebalance_ends_at ? new Date(userData.rebalance_ends_at) : null;
      const rebalanceTargetMultiplier = userData?.rebalance_target_multiplier ?? null;

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
