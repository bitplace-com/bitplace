import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isPixelSyncing, getCachedPixelData, subscribeToCacheChanges } from './useTileCache';

interface OwnerProfile {
  id: string;
  display_name: string | null;
  wallet_short: string | null;  // Truncated wallet for display (4J2k...Za7C)
  country_code: string | null;
  alliance_tag: string | null;
  avatar_url: string | null;
  owner_health_multiplier: number;
  rebalance_active: boolean;
  rebalance_started_at: string | null;
  rebalance_ends_at: string | null;
  rebalance_target_multiplier: number | null;
  // Profile fields
  bio: string | null;
  social_x: string | null;
  social_instagram: string | null;
  social_website: string | null;
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

export interface MyContribution {
  side: 'DEF' | 'ATK';
  amount_pe: number;
  contributionId: number;
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
  myContribution: MyContribution | null;
  isSyncing: boolean; // True when tile is optimistic/stale
}

export function usePixelDetails(x: number | null, y: number | null, currentUserId?: string) {
  const [pixel, setPixel] = useState<PixelDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [, forceUpdate] = useState(0);

  // Subscribe to cache changes to re-check syncing status
  useEffect(() => {
    const unsubscribe = subscribeToCacheChanges(() => {
      forceUpdate(v => v + 1);
    });
    return unsubscribe;
  }, []);

  // Re-fetch when syncing status changes (cache updates)
  useEffect(() => {
    if (pixel?.isSyncing && x !== null && y !== null) {
      const syncing = isPixelSyncing(x, y);
      if (!syncing) {
        // Syncing completed, refetch full data from DB
        fetchPixelDetails();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pixel?.isSyncing, x, y, forceUpdate]);

  const fetchPixelDetails = useCallback(async () => {
    if (x === null || y === null) { setPixel(null); return; }
    setIsLoading(true);

    // Check if pixel is syncing
    const syncing = isPixelSyncing(x, y);
    const cachedPixel = getCachedPixelData(x, y);

    try {
      // Fetch pixels with denormalized def_total and atk_total columns
      const { data: pixelData } = await supabase
        .from('pixels')
        .select('id, x, y, color, owner_user_id, owner_stake_pe, def_total, atk_total')
        .eq('x', x)
        .eq('y', y)
        .maybeSingle();

      // If no data from DB but we have cached pixel (optimistic), show partial data
      if (!pixelData && cachedPixel) {
        setPixel({
          x, y,
          color: cachedPixel.color,
          owner: null,
          owner_stake_pe: 0,
          defTotal: 0,
          atkTotal: 0,
          vNow: 0,
          threshold: 1,
          defenders: [],
          attackers: [],
          ownerHealthMultiplier: 1,
          ownerRebalanceActive: false,
          ownerRebalanceEndsAt: null,
          effectiveOwnerStake: 0,
          nextTickTime: null,
          multiplierAtNextTick: 1,
          vFloorNext6h: null,
          thresholdWithFloor: 1,
          isFloorBased: false,
          myContribution: null,
          isSyncing: true, // Mark as syncing
        });
        setIsLoading(false);
        return;
      }

      if (!pixelData) {
        setPixel({ x, y, color: cachedPixel?.color || null, owner: null, owner_stake_pe: 0, defTotal: 0, atkTotal: 0, vNow: 0, threshold: 1, defenders: [], attackers: [], ownerHealthMultiplier: 1, ownerRebalanceActive: false, ownerRebalanceEndsAt: null, effectiveOwnerStake: 0, nextTickTime: null, multiplierAtNextTick: 1, vFloorNext6h: null, thresholdWithFloor: 1, isFloorBased: false, myContribution: null, isSyncing: syncing });
        setIsLoading(false);
        return;
      }
      
      // Use denormalized totals from pixels table (auto-updated by trigger)
      const defTotal = Number((pixelData as any).def_total ?? 0);
      const atkTotal = Number((pixelData as any).atk_total ?? 0);

      let owner: OwnerProfile | null = null;
      if (pixelData.owner_user_id) {
        console.log('[usePixelDetails] Fetching owner profile for:', pixelData.owner_user_id);
        // Use public_pixel_owner_info view - safe public fields only (wallet_short, not full address)
        const { data: ownerData, error: ownerError } = await supabase
          .from('public_pixel_owner_info' as any)
          .select('id, display_name, wallet_short, avatar_url, country_code, alliance_tag, owner_health_multiplier, rebalance_active, rebalance_started_at, rebalance_ends_at, rebalance_target_multiplier, bio, social_x, social_instagram, social_website')
          .eq('id', pixelData.owner_user_id)
          .maybeSingle();
        
        if (ownerError) {
          console.error('[usePixelDetails] Owner fetch error:', ownerError);
        }
        
        if (ownerData) {
          const data = ownerData as Record<string, any>;
          console.log('[usePixelDetails] Owner data found:', { 
            id: data.id, 
            display_name: data.display_name, 
            wallet_short: data.wallet_short 
          });
          owner = {
            id: data.id,
            display_name: data.display_name,
            wallet_short: data.wallet_short,  // Truncated wallet from view
            country_code: data.country_code,
            alliance_tag: data.alliance_tag,
            avatar_url: data.avatar_url,
            owner_health_multiplier: data.owner_health_multiplier ?? 1,
            rebalance_active: data.rebalance_active ?? false,
            rebalance_started_at: data.rebalance_started_at,
            rebalance_ends_at: data.rebalance_ends_at,
            rebalance_target_multiplier: data.rebalance_target_multiplier,
            bio: data.bio ?? null,
            social_x: data.social_x ?? null,
            social_instagram: data.social_instagram ?? null,
            social_website: data.social_website ?? null,
          };
        } else {
          console.warn('[usePixelDetails] No owner profile found for:', pixelData.owner_user_id);
        }
      }

      const { data: contributions } = await supabase.from('pixel_contributions').select('id, user_id, amount_pe, side').eq('pixel_id', pixelData.id);
      const userIds = [...new Set(contributions?.map(c => c.user_id) || [])];
      let userMap: Record<string, string | null> = {};
      if (userIds.length > 0) {
        // Use public_user_profiles view instead of users table (RLS blocks direct users access)
        const { data: users } = await supabase.from('public_user_profiles' as any).select('id, display_name').in('id', userIds);
        (users as any[])?.forEach(u => { userMap[u.id] = u.display_name; });
      }

      // Fetch contribution details for display (list of defenders/attackers)
      // Totals come from denormalized columns, not summed here
      const defenders: Contribution[] = [], attackers: Contribution[] = [];
      let myContribution: MyContribution | null = null;
      
      contributions?.forEach(c => {
        const contribution = { user_id: c.user_id, display_name: userMap[c.user_id] || null, amount_pe: Number(c.amount_pe) };
        if (c.side === 'DEF') { defenders.push(contribution); }
        else if (c.side === 'ATK') { attackers.push(contribution); }
        
        // Check if this is the current user's contribution
        if (currentUserId && c.user_id === currentUserId && Number(c.amount_pe) > 0) {
          myContribution = {
            side: c.side as 'DEF' | 'ATK',
            amount_pe: Number(c.amount_pe),
            contributionId: c.id,
          };
        }
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

      setPixel({ x, y, color: pixelData.color, owner, owner_stake_pe: ownerStake, defTotal, atkTotal, vNow, threshold: Math.max(0, vNow) + 1, defenders, attackers, ownerHealthMultiplier: healthMultiplier, ownerRebalanceActive: rebalanceActive, ownerRebalanceEndsAt: owner?.rebalance_ends_at ? new Date(owner.rebalance_ends_at) : null, effectiveOwnerStake, nextTickTime, multiplierAtNextTick, vFloorNext6h, thresholdWithFloor, isFloorBased, myContribution, isSyncing: syncing });
    } catch (error) {
      console.error('Error fetching pixel details:', error);
      // Check cached pixel for fallback color
      const cachedFallback = getCachedPixelData(x ?? 0, y ?? 0);
      // Return safe defaults on error instead of null - prevents UI crashes
      setPixel({
        x: x ?? 0,
        y: y ?? 0,
        color: cachedFallback?.color || null,
        owner: null,
        owner_stake_pe: 0,
        defTotal: 0,
        atkTotal: 0,
        vNow: 0,
        threshold: 1,
        defenders: [],
        attackers: [],
        ownerHealthMultiplier: 1,
        ownerRebalanceActive: false,
        ownerRebalanceEndsAt: null,
        effectiveOwnerStake: 0,
        nextTickTime: null,
        multiplierAtNextTick: 1,
        vFloorNext6h: null,
        thresholdWithFloor: 1,
        isFloorBased: false,
        myContribution: null,
        isSyncing: isPixelSyncing(x ?? 0, y ?? 0),
      });
    } finally {
      setIsLoading(false);
    }
  }, [x, y, currentUserId]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetchPixelDetailsStable = useCallback(fetchPixelDetails, [x, y, currentUserId]);

  useEffect(() => { fetchPixelDetailsStable(); }, [fetchPixelDetailsStable]);
  return { pixel, isLoading, refetch: fetchPixelDetailsStable };
}
