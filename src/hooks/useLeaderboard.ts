import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type LeaderboardScope = "players" | "countries" | "alliances";
export type LeaderboardSubCategory = "painters" | "investors" | "defenders" | "attackers";
export type LeaderboardPeriod = "today" | "week" | "month" | "all";

export interface PlayerPainterEntry {
  rank: number;
  id: string;
  displayName: string | null;
  countryCode: string | null;
  allianceTag: string | null;
  totalPixels: number;
  avatarUrl: string | null;
  bio: string | null;
  socialX: string | null;
  socialInstagram: string | null;
  socialWebsite: string | null;
  walletAddress: string | null;
  authProvider: string | null;
  peUsedPe: number;
  nativeBalance: number;
}

export interface PlayerPeEntry {
  rank: number;
  id: string;
  displayName: string | null;
  countryCode: string | null;
  allianceTag: string | null;
  totalPe: number;
  avatarUrl: string | null;
  bio: string | null;
  socialX: string | null;
  socialInstagram: string | null;
  socialWebsite: string | null;
  walletAddress: string | null;
  authProvider: string | null;
  peUsedPe: number;
  nativeBalance: number;
}

export interface CountryPainterEntry {
  rank: number;
  countryCode: string;
  playerCount: number;
  totalPixels: number;
}

export interface CountryPeEntry {
  rank: number;
  countryCode: string;
  playerCount: number;
  totalPe: number;
}

export interface AlliancePainterEntry {
  rank: number;
  allianceTag: string;
  allianceName: string;
  playerCount: number;
  totalPixels: number;
}

export interface AlliancePeEntry {
  rank: number;
  allianceTag: string;
  allianceName: string;
  playerCount: number;
  totalPe: number;
}

export type LeaderboardEntry = 
  | PlayerPainterEntry | PlayerPeEntry 
  | CountryPainterEntry | CountryPeEntry 
  | AlliancePainterEntry | AlliancePeEntry;

interface UseLeaderboardResult {
  data: LeaderboardEntry[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useLeaderboard(
  scope: LeaderboardScope,
  subCategory: LeaderboardSubCategory,
  period: LeaderboardPeriod,
): UseLeaderboardResult {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: result, error: fnError } = await supabase.functions.invoke(
        "leaderboard-get",
        { body: { scope, subCategory, period } }
      );

      if (fnError) {
        console.error("[useLeaderboard] Function error:", fnError);
        setError("Failed to fetch leaderboard");
        return;
      }

      if (result?.error) {
        console.error("[useLeaderboard] API error:", result.error);
        setError(result.error);
        return;
      }

      setData(result?.data || []);
    } catch (err) {
      console.error("[useLeaderboard] Error:", err);
      setError("Failed to fetch leaderboard");
    } finally {
      setIsLoading(false);
    }
  }, [scope, subCategory, period]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return { data, isLoading, error, refetch: fetchLeaderboard };
}
