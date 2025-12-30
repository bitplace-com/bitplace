import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PeBalance {
  total: number;
  locked: number;
  free: number;
  isLoading: boolean;
}

export function usePeBalance(userId: string | undefined): PeBalance {
  const [balance, setBalance] = useState<PeBalance>({
    total: 0,
    locked: 0,
    free: 0,
    isLoading: true,
  });

  const fetchBalance = useCallback(async () => {
    if (!userId) {
      setBalance({ total: 0, locked: 0, free: 0, isLoading: false });
      return;
    }

    try {
      // Fetch user's pe_total_pe
      const { data: userData } = await supabase
        .from('users')
        .select('pe_total_pe')
        .eq('id', userId)
        .maybeSingle();

      const total = Number(userData?.pe_total_pe || 0);

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

      setBalance({
        total,
        locked,
        free: Math.max(0, free),
        isLoading: false,
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
