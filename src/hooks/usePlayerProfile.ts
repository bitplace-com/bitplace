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
  googleAvatarUrl: string | null;
  countryCode: string | null;
  allianceTag: string | null;
  authProvider: string | null;
  peUsed: number;
  bio: string | null;
  socialX: string | null;
  socialInstagram: string | null;
  socialDiscord: string | null;
  socialWebsite: string | null;
  // Stats
  totalPixelsOwned: number;
  totalStaked: number;
  pixelsPaintedTotal: number;
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
      // Fetch user profile from public view (includes created_at, pe_used_pe, wallet_address)
      const { data: userData, error: userError } = await supabase
        .from('public_user_profiles' as any)
        .select('id, display_name, wallet_short, wallet_address, avatar_url, country_code, alliance_tag, pixels_painted_total, created_at, pe_used_pe, auth_provider')
        .eq('id', playerId)
        .maybeSingle();

      if (userError) throw userError;
      if (!userData) {
        setError('Player not found');
        setIsLoading(false);
        return;
      }

      // Fetch additional profile fields from public_pixel_owner_info (has bio/socials/google_avatar_url)
      const { data: profileData } = await supabase
        .from('public_pixel_owner_info' as any)
        .select('bio, social_x, social_instagram, social_discord, social_website, google_avatar_url')
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
          .select('x, y, color, owner_stake_pe, is_virtual_stake, created_at')
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

      const totalStaked = (pixelsData || [])
        .filter(p => !p.is_virtual_stake)
        .reduce((sum, p) => sum + Number(p.owner_stake_pe || 0), 0);

      const user = userData as Record<string, any>;
      const profile = profileData as Record<string, any> | null;

      // Use google_avatar_url as fallback when avatar_url is not set
      const resolvedAvatar = user.avatar_url || profile?.google_avatar_url || null;

      setProfile({
        id: user.id,
        displayName: user.display_name,
        walletShort: user.wallet_short,
        walletAddress: user.wallet_address || null,
        avatarUrl: resolvedAvatar,
        googleAvatarUrl: profile?.google_avatar_url || null,
        countryCode: user.country_code,
        allianceTag: user.alliance_tag,
        authProvider: user.auth_provider || null,
        peUsed: Number(user.pe_used_pe) || 0,
        bio: profile?.bio || null,
        socialX: profile?.social_x || null,
        socialInstagram: profile?.social_instagram || null,
        socialDiscord: profile?.social_discord || null,
        socialWebsite: profile?.social_website || null,
        totalPixelsOwned: pixels.length,
        totalStaked,
        pixelsPaintedTotal: Number(user.pixels_painted_total) || 0,
        joinedAt: user.created_at || new Date().toISOString(),
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
