import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type LeaderboardScope = "players" | "countries" | "alliances";
export type LeaderboardPeriod = "today" | "week" | "month" | "all";
export type LeaderboardMetric = "pixels" | "pe_staked";

export interface PlayerEntry {
  rank: number;
  id: string;
  displayName: string | null;
  countryCode: string | null;
  allianceTag: string | null;
  totalPixels: number;
  totalPeStaked: number;
  avatarUrl: string | null;
  bio: string | null;
  socialX: string | null;
  socialInstagram: string | null;
  socialWebsite: string | null;
}

export interface CountryEntry {
  rank: number;
  countryCode: string;
  playerCount: number;
  totalPixels: number;
  totalPeStaked: number;
}

export interface AllianceEntry {
  rank: number;
  allianceTag: string;
  allianceName: string;
  playerCount: number;
  totalPixels: number;
  totalPeStaked: number;
}

export type LeaderboardEntry = PlayerEntry | CountryEntry | AllianceEntry;

interface UseLeaderboardResult {
  data: LeaderboardEntry[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useLeaderboard(
  scope: LeaderboardScope,
  period: LeaderboardPeriod,
  metric: LeaderboardMetric = "pixels"
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
        { body: { scope, period, metric } }
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
  }, [scope, period, metric]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return { data, isLoading, error, refetch: fetchLeaderboard };
}
