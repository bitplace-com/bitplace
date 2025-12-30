import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface OwnerProfile {
  id: string;
  display_name: string | null;
  wallet_address: string | null;
  country_code: string | null;
  alliance_tag: string | null;
}

interface Contribution {
  user_id: string;
  display_name: string | null;
  amount_pe: number;
}

export interface PixelDetails {
  x: number;
  y: number;
  color: string | null;
  owner: OwnerProfile | null;
  owner_stake_pe: number;
  defTotal: number;
  atkTotal: number;
  vNow: number;
  threshold: number;
  defenders: Contribution[];
  attackers: Contribution[];
}

export function usePixelDetails(x: number | null, y: number | null) {
  const [pixel, setPixel] = useState<PixelDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPixelDetails = useCallback(async () => {
    if (x === null || y === null) {
      setPixel(null);
      return;
    }

    setIsLoading(true);

    try {
      // Fetch pixel with owner info
      const { data: pixelData } = await supabase
        .from('pixels')
        .select('id, x, y, color, owner_user_id, owner_stake_pe')
        .eq('x', x)
        .eq('y', y)
        .maybeSingle();

      if (!pixelData) {
        // Empty pixel
        setPixel({
          x,
          y,
          color: null,
          owner: null,
          owner_stake_pe: 0,
          defTotal: 0,
          atkTotal: 0,
          vNow: 0,
          threshold: 1,
          defenders: [],
          attackers: [],
        });
        setIsLoading(false);
        return;
      }

      // Fetch owner profile if exists
      let owner: OwnerProfile | null = null;
      if (pixelData.owner_user_id) {
        const { data: ownerData } = await supabase
          .from('users')
          .select('id, display_name, wallet_address, country_code, alliance_tag')
          .eq('id', pixelData.owner_user_id)
          .maybeSingle();
        
        if (ownerData) {
          owner = ownerData;
        }
      }

      // Fetch contributions
      const { data: contributions } = await supabase
        .from('pixel_contributions')
        .select('user_id, amount_pe, side')
        .eq('pixel_id', pixelData.id);

      // Get user info for contributions
      const userIds = contributions?.map(c => c.user_id) || [];
      const uniqueUserIds = [...new Set(userIds)];
      
      let userMap: Record<string, string | null> = {};
      if (uniqueUserIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, display_name')
          .in('id', uniqueUserIds);
        
        users?.forEach(u => {
          userMap[u.id] = u.display_name;
        });
      }

      const defenders: Contribution[] = [];
      const attackers: Contribution[] = [];
      let defTotal = 0;
      let atkTotal = 0;

      contributions?.forEach(c => {
        const contribution: Contribution = {
          user_id: c.user_id,
          display_name: userMap[c.user_id] || null,
          amount_pe: Number(c.amount_pe),
        };

        if (c.side === 'DEF') {
          defenders.push(contribution);
          defTotal += contribution.amount_pe;
        } else if (c.side === 'ATK') {
          attackers.push(contribution);
          atkTotal += contribution.amount_pe;
        }
      });

      const owner_stake_pe = Number(pixelData.owner_stake_pe);
      const vNow = owner_stake_pe + defTotal - atkTotal;
      const threshold = Math.max(0, vNow) + 1;

      setPixel({
        x,
        y,
        color: pixelData.color,
        owner,
        owner_stake_pe,
        defTotal,
        atkTotal,
        vNow,
        threshold,
        defenders,
        attackers,
      });
    } catch (error) {
      console.error('Error fetching pixel details:', error);
      setPixel(null);
    } finally {
      setIsLoading(false);
    }
  }, [x, y]);

  useEffect(() => {
    fetchPixelDetails();
  }, [fetchPixelDetails]);

  return { pixel, isLoading, refetch: fetchPixelDetails };
}
