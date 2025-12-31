import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface OwnerProfile {
  id: string;
  display_name: string | null;
  wallet_address: string | null;
  country_code: string | null;
  alliance_tag: string | null;
  owner_health_multiplier: number;
  rebalance_active: boolean;
  rebalance_started_at: string | null;
  rebalance_ends_at: string | null;
  rebalance_target_multiplier: number | null;
}

interface Contribution {
  user_id: string;
  display_name: string | null;
  amount_pe: number;
}

const TICK_INTERVAL_MS = 6 * 60 * 60 * 1000;

function getNextTickTime(now: Date): Date {
  const ms = now.getTime();
  return new Date(Math.ceil(ms / TICK_INTERVAL_MS) * TICK_INTERVAL_MS);
}

function calculateMultiplierAtTime(startedAt: Date, endsAt: Date, targetMultiplier: number, atTime: Date): number {
  const totalDuration = endsAt.getTime() - startedAt.getTime();
  const elapsed = atTime.getTime() - startedAt.getTime();
  if (elapsed <= 0) return 1;
  if (elapsed >= totalDuration) return targetMultiplier;
  return 1 - (1 - targetMultiplier) * (elapsed / totalDuration);
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
  ownerHealthMultiplier: number;
  ownerRebalanceActive: boolean;
  ownerRebalanceEndsAt: Date | null;
  effectiveOwnerStake: number;
  nextTickTime: Date | null;
  multiplierAtNextTick: number;
  vFloorNext6h: number | null;
  thresholdWithFloor: number;
  isFloorBased: boolean;
}

export function usePixelDetails(x: number | null, y: number | null) {
  const [pixel, setPixel] = useState<PixelDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPixelDetails = useCallback(async () => {
    if (x === null || y === null) { setPixel(null); return; }
    setIsLoading(true);

    try {
      const { data: pixelData } = await supabase.from('pixels').select('id, x, y, color, owner_user_id, owner_stake_pe').eq('x', x).eq('y', y).maybeSingle();

      if (!pixelData) {
        setPixel({ x, y, color: null, owner: null, owner_stake_pe: 0, defTotal: 0, atkTotal: 0, vNow: 0, threshold: 1, defenders: [], attackers: [], ownerHealthMultiplier: 1, ownerRebalanceActive: false, ownerRebalanceEndsAt: null, effectiveOwnerStake: 0, nextTickTime: null, multiplierAtNextTick: 1, vFloorNext6h: null, thresholdWithFloor: 1, isFloorBased: false });
        setIsLoading(false);
        return;
      }

      let owner: OwnerProfile | null = null;
      if (pixelData.owner_user_id) {
        // Use public_pixel_owner_info view - safe public fields only (no wallet/financial data)
        const { data: ownerData } = await supabase
          .from('public_pixel_owner_info' as any)
          .select('id, display_name, country_code, alliance_tag, owner_health_multiplier, rebalance_active, rebalance_started_at, rebalance_ends_at, rebalance_target_multiplier')
          .eq('id', pixelData.owner_user_id)
          .maybeSingle();
        
        if (ownerData) {
          const data = ownerData as Record<string, any>;
          owner = {
            id: data.id,
            display_name: data.display_name,
            wallet_address: null,
            country_code: data.country_code,
            alliance_tag: data.alliance_tag,
            owner_health_multiplier: data.owner_health_multiplier ?? 1,
            rebalance_active: data.rebalance_active ?? false,
            rebalance_started_at: data.rebalance_started_at,
            rebalance_ends_at: data.rebalance_ends_at,
            rebalance_target_multiplier: data.rebalance_target_multiplier,
          };
        }
      }

      const { data: contributions } = await supabase.from('pixel_contributions').select('user_id, amount_pe, side').eq('pixel_id', pixelData.id);
      const userIds = [...new Set(contributions?.map(c => c.user_id) || [])];
      let userMap: Record<string, string | null> = {};
      if (userIds.length > 0) {
        const { data: users } = await supabase.from('users').select('id, display_name').in('id', userIds);
        users?.forEach(u => { userMap[u.id] = u.display_name; });
      }

      const defenders: Contribution[] = [], attackers: Contribution[] = [];
      let defTotal = 0, atkTotal = 0;
      contributions?.forEach(c => {
        const contribution = { user_id: c.user_id, display_name: userMap[c.user_id] || null, amount_pe: Number(c.amount_pe) };
        if (c.side === 'DEF') { defenders.push(contribution); defTotal += contribution.amount_pe; }
        else if (c.side === 'ATK') { attackers.push(contribution); atkTotal += contribution.amount_pe; }
      });

      const ownerStake = Number(pixelData.owner_stake_pe);
      const healthMultiplier = owner?.owner_health_multiplier ?? 1;
      const rebalanceActive = owner?.rebalance_active ?? false;
      const effectiveOwnerStake = ownerStake * healthMultiplier;
      const vNow = ownerStake + defTotal - atkTotal;

      const now = new Date();
      const nextTickTime = getNextTickTime(now);
      let multiplierAtNextTick = 1, vFloorNext6h: number | null = null, thresholdWithFloor = Math.max(0, vNow) + 1, isFloorBased = false;

      if (rebalanceActive && owner?.rebalance_started_at && owner?.rebalance_ends_at && owner?.rebalance_target_multiplier !== null) {
        multiplierAtNextTick = calculateMultiplierAtTime(new Date(owner.rebalance_started_at), new Date(owner.rebalance_ends_at), owner.rebalance_target_multiplier, nextTickTime);
        vFloorNext6h = ownerStake * multiplierAtNextTick + defTotal - atkTotal;
        thresholdWithFloor = Math.max(0, vFloorNext6h) + 1;
        isFloorBased = true;
      }

      setPixel({ x, y, color: pixelData.color, owner, owner_stake_pe: ownerStake, defTotal, atkTotal, vNow, threshold: Math.max(0, vNow) + 1, defenders, attackers, ownerHealthMultiplier: healthMultiplier, ownerRebalanceActive: rebalanceActive, ownerRebalanceEndsAt: owner?.rebalance_ends_at ? new Date(owner.rebalance_ends_at) : null, effectiveOwnerStake, nextTickTime, multiplierAtNextTick, vFloorNext6h, thresholdWithFloor, isFloorBased });
    } catch (error) {
      console.error('Error fetching pixel details:', error);
      setPixel(null);
    } finally {
      setIsLoading(false);
    }
  }, [x, y]);

  useEffect(() => { fetchPixelDetails(); }, [fetchPixelDetails]);
  return { pixel, isLoading, refetch: fetchPixelDetails };
}
