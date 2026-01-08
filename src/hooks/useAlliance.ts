import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const SESSION_TOKEN_KEY = 'bitplace_session_token';

export interface Alliance {
  id: string;
  name: string;
  tag: string;
  memberCount: number;
  created_at: string;
  isLeader: boolean;
}

export interface AllianceMember {
  userId: string;
  displayName: string | null;
  walletAddress: string;
  role: string;
  joinedAt: string;
  level: number;
}

interface UseAllianceResult {
  alliance: Alliance | null;
  members: AllianceMember[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAlliance(userId: string | undefined): UseAllianceResult {
  const [alliance, setAlliance] = useState<Alliance | null>(null);
  const [members, setMembers] = useState<AllianceMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAlliance = useCallback(async () => {
    if (!userId) {
      setAlliance(null);
      setMembers([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem(SESSION_TOKEN_KEY);
      if (!token) {
        setAlliance(null);
        setMembers([]);
        return;
      }

      const { data, error: fnError } = await supabase.functions.invoke("alliance-manage", {
        body: { action: "get" },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (fnError) {
        console.error("[useAlliance] Error:", fnError);
        setError("Failed to fetch alliance");
        return;
      }

      setAlliance(data.alliance || null);
      setMembers(data.members || []);
    } catch (err) {
      console.error("[useAlliance] Error:", err);
      setError("Failed to fetch alliance");
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchAlliance();
  }, [fetchAlliance]);

  return { alliance, members, isLoading, error, refetch: fetchAlliance };
}
