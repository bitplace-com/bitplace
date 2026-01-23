import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAuthHeadersOrExpire } from "@/lib/authHelpers";

export interface AllianceInvite {
  id: string;
  allianceId: string;
  allianceName: string;
  allianceTag: string;
  invitedByName: string;
  createdAt: string;
}

interface UseAllianceInvitesResult {
  invites: AllianceInvite[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  acceptInvite: (inviteId: string) => Promise<boolean>;
  declineInvite: (inviteId: string) => Promise<boolean>;
}

export function useAllianceInvites(userId: string | undefined): UseAllianceInvitesResult {
  const [invites, setInvites] = useState<AllianceInvite[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInvites = useCallback(async () => {
    if (!userId) {
      setInvites([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const headers = getAuthHeadersOrExpire();
      if (!headers) {
        setInvites([]);
        return;
      }

      const { data, error: fnError } = await supabase.functions.invoke("alliance-manage", {
        body: { action: "get-invites" },
        headers,
      });

      if (fnError) {
        console.error("[useAllianceInvites] Error:", fnError);
        setError("Failed to fetch invites");
        return;
      }

      setInvites(data.invites || []);
    } catch (err) {
      console.error("[useAllianceInvites] Error:", err);
      setError("Failed to fetch invites");
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const acceptInvite = useCallback(async (inviteId: string): Promise<boolean> => {
    try {
      const headers = getAuthHeadersOrExpire();
      if (!headers) return false;

      const { data, error } = await supabase.functions.invoke("alliance-manage", {
        body: { action: "accept-invite", inviteId },
        headers,
      });

      if (error || data?.error) {
        console.error("[useAllianceInvites] Accept error:", data?.error || error);
        return false;
      }

      await fetchInvites();
      return true;
    } catch (err) {
      console.error("[useAllianceInvites] Accept error:", err);
      return false;
    }
  }, [fetchInvites]);

  const declineInvite = useCallback(async (inviteId: string): Promise<boolean> => {
    try {
      const headers = getAuthHeadersOrExpire();
      if (!headers) return false;

      const { data, error } = await supabase.functions.invoke("alliance-manage", {
        body: { action: "decline-invite", inviteId },
        headers,
      });

      if (error || data?.error) {
        console.error("[useAllianceInvites] Decline error:", data?.error || error);
        return false;
      }

      await fetchInvites();
      return true;
    } catch (err) {
      console.error("[useAllianceInvites] Decline error:", err);
      return false;
    }
  }, [fetchInvites]);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  return { invites, isLoading, error, refetch: fetchInvites, acceptInvite, declineInvite };
}