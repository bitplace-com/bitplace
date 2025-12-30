import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to track which owner user IDs are currently in rebalance mode.
 * Used by CanvasOverlay to visually mark pixels owned by rebalancing users.
 */
export function useRebalancingOwners() {
  const [rebalancingOwnerIds, setRebalancingOwnerIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const fetchRebalancingOwners = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('rebalance_active', true);

      if (error) {
        console.error('Error fetching rebalancing owners:', error);
        return;
      }

      setRebalancingOwnerIds(new Set((data || []).map(u => u.id)));
    } catch (error) {
      console.error('Error fetching rebalancing owners:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRebalancingOwners();

    // Refresh every minute to catch updates
    const interval = setInterval(fetchRebalancingOwners, 60000);
    return () => clearInterval(interval);
  }, [fetchRebalancingOwners]);

  return { rebalancingOwnerIds, isLoading, refetch: fetchRebalancingOwners };
}
