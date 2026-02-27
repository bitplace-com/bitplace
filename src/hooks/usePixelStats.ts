import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PixelStats {
  pixelsOwned: number;
  totalStaked: number;
  totalDefending: number;
  totalAttacking: number;
  isLoading: boolean;
}

interface UsePixelStatsReturn extends PixelStats {
  refetch: () => void;
}

export function usePixelStats(userId: string | undefined): UsePixelStatsReturn {
  const [stats, setStats] = useState<PixelStats>({
    pixelsOwned: 0,
    totalStaked: 0,
    totalDefending: 0,
    totalAttacking: 0,
    isLoading: true,
  });

  const fetchStats = useCallback(async () => {
    if (!userId) {
      setStats(prev => ({ ...prev, isLoading: false }));
      return;
    }

    setStats(prev => ({ ...prev, isLoading: true }));

    try {
      // Query pixels owned
      const { data: owned, error: ownedError } = await supabase
        .from("pixels")
        .select("id, owner_stake_pe, is_virtual_stake")
        .eq("owner_user_id", userId);

      if (ownedError) {
        console.error("Error fetching owned pixels:", ownedError);
      }

      // Query contributions
      const { data: contribs, error: contribError } = await supabase
        .from("pixel_contributions")
        .select("side, amount_pe")
        .eq("user_id", userId);

      if (contribError) {
        console.error("Error fetching contributions:", contribError);
      }

      const pixelsOwned = owned?.length || 0;
      const totalStaked = owned?.filter(p => !p.is_virtual_stake).reduce((s, p) => s + Number(p.owner_stake_pe || 0), 0) || 0;
      const totalDefending = contribs
        ?.filter(c => c.side === "DEF")
        .reduce((s, c) => s + Number(c.amount_pe || 0), 0) || 0;
      const totalAttacking = contribs
        ?.filter(c => c.side === "ATK")
        .reduce((s, c) => s + Number(c.amount_pe || 0), 0) || 0;

      setStats({
        pixelsOwned,
        totalStaked,
        totalDefending,
        totalAttacking,
        isLoading: false,
      });
    } catch (err) {
      console.error("Error fetching pixel stats:", err);
      setStats(prev => ({ ...prev, isLoading: false }));
    }
  }, [userId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { ...stats, refetch: fetchStats };
}
