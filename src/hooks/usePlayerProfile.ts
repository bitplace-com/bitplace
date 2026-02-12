import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PlayerPixel {
  x: number;
  y: number;
  color: string;
}

export interface PlayerProfile {
  id: string;
  displayName: string | null;
  walletShort: string | null;
  walletAddress: string | null;
  avatarUrl: string | null;
  countryCode: string | null;
  allianceTag: string | null;
  peUsed: number;
  bio: string | null;
  socialX: string | null;
  socialInstagram: string | null;
  socialDiscord: string | null;
  socialWebsite: string | null;
  // Stats
  totalPixelsOwned: number;
  totalStaked: number;
  joinedAt: string;
  // Pixels for mini-map
  pixels: PlayerPixel[];
}

export function usePlayerProfile(playerId: string | null) {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!playerId) {
      setProfile(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch user profile from public view
      const { data: userData, error: userError } = await supabase
        .from('public_user_profiles' as any)
        .select('id, display_name, wallet_short, avatar_url, country_code, alliance_tag, pixels_painted_total')
        .eq('id', playerId)
        .maybeSingle();

      if (userError) throw userError;
      if (!userData) {
        setError('Player not found');
        setIsLoading(false);
        return;
      }

      // Fetch additional profile fields from public_pixel_owner_info (has bio/socials)
      const { data: profileData } = await supabase
        .from('public_pixel_owner_info' as any)
        .select('bio, social_x, social_instagram, social_discord, social_website')
        .eq('id', playerId)
        .maybeSingle();

      // Fetch pixels owned by this player (paginated)
      const PAGE_SIZE = 1000;
      let offset = 0;
      let pixelsData: any[] = [];
      let hasMore = true;

      while (hasMore) {
        const { data, error: pErr } = await supabase
          .from('pixels')
          .select('x, y, color, owner_stake_pe, created_at')
          .eq('owner_user_id', playerId)
          .range(offset, offset + PAGE_SIZE - 1);

        if (pErr) throw pErr;
        if (data) pixelsData = pixelsData.concat(data);
        hasMore = (data?.length || 0) === PAGE_SIZE;
        offset += PAGE_SIZE;
      }

      const pixels: PlayerPixel[] = (pixelsData || []).map(p => ({
        x: Number(p.x),
        y: Number(p.y),
        color: p.color,
      }));

      const totalStaked = (pixelsData || []).reduce(
        (sum, p) => sum + Number(p.owner_stake_pe || 0),
        0
      );

      // Get user creation date and pe_used_pe
      const { data: userExtra } = await supabase
        .from('users')
        .select('created_at, pe_used_pe, wallet_address')
        .eq('id', playerId)
        .maybeSingle();

      const user = userData as Record<string, any>;
      const profile = profileData as Record<string, any> | null;

      setProfile({
        id: user.id,
        displayName: user.display_name,
        walletShort: user.wallet_short,
        walletAddress: (userExtra as any)?.wallet_address || null,
        avatarUrl: user.avatar_url,
        countryCode: user.country_code,
        allianceTag: user.alliance_tag,
        peUsed: Number((userExtra as any)?.pe_used_pe) || 0,
        bio: profile?.bio || null,
        socialX: profile?.social_x || null,
        socialInstagram: profile?.social_instagram || null,
        socialDiscord: profile?.social_discord || null,
        socialWebsite: profile?.social_website || null,
        totalPixelsOwned: pixels.length,
        totalStaked,
        joinedAt: (userExtra as any)?.created_at || new Date().toISOString(),
        pixels,
      });
    } catch (err) {
      console.error('[usePlayerProfile] Error:', err);
      setError('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  }, [playerId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { profile, isLoading, error, refetch: fetchProfile };
}
