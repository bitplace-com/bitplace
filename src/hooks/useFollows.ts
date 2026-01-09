import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWallet } from "@/contexts/WalletContext";

const SESSION_TOKEN_KEY = 'bitplace_session_token';
const getSessionToken = () => localStorage.getItem(SESSION_TOKEN_KEY);

interface UseFollowsResult {
  followedIds: string[];
  isLoading: boolean;
  isFollowing: (userId: string) => boolean;
  follow: (userId: string) => Promise<boolean>;
  unfollow: (userId: string) => Promise<boolean>;
  followersCount: number;
  followingCount: number;
  refetch: () => Promise<void>;
}

export function useFollows(): UseFollowsResult {
  const { user } = useWallet();
  const userId = user?.id;
  const [followedIds, setFollowedIds] = useState<string[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchFollows = useCallback(async () => {
    if (!userId) {
      setFollowedIds([]);
      setFollowersCount(0);
      setFollowingCount(0);
      return;
    }

    setIsLoading(true);
    try {
      // Get who I'm following
      const { data: following } = await supabase
        .from("user_follows")
        .select("followed_id")
        .eq("follower_id", userId);

      setFollowedIds((following || []).map(f => f.followed_id));
      setFollowingCount((following || []).length);

      // Get my followers count
      const { count } = await supabase
        .from("user_follows")
        .select("*", { count: "exact", head: true })
        .eq("followed_id", userId);

      setFollowersCount(count || 0);
    } catch (err) {
      console.error("[useFollows] Error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchFollows();
  }, [fetchFollows]);

  const isFollowing = useCallback((targetUserId: string) => {
    return followedIds.includes(targetUserId);
  }, [followedIds]);

  const follow = useCallback(async (targetUserId: string): Promise<boolean> => {
    const token = getSessionToken();
    if (!userId || !token || targetUserId === userId) return false;

    try {
      const { error } = await supabase.functions.invoke("notifications-manage", {
        headers: { Authorization: `Bearer ${token}` },
        body: { action: "follow", targetUserId }
      });

      if (error) throw error;

      setFollowedIds(prev => [...prev, targetUserId]);
      setFollowingCount(prev => prev + 1);
      return true;
    } catch (err) {
      console.error("[useFollows] Follow error:", err);
      return false;
    }
  }, [userId]);

  const unfollow = useCallback(async (targetUserId: string): Promise<boolean> => {
    const token = getSessionToken();
    if (!userId || !token) return false;

    try {
      const { error } = await supabase.functions.invoke("notifications-manage", {
        headers: { Authorization: `Bearer ${token}` },
        body: { action: "unfollow", targetUserId }
      });

      if (error) throw error;

      setFollowedIds(prev => prev.filter(id => id !== targetUserId));
      setFollowingCount(prev => Math.max(0, prev - 1));
      return true;
    } catch (err) {
      console.error("[useFollows] Unfollow error:", err);
      return false;
    }
  }, [userId]);

  return {
    followedIds,
    isLoading,
    isFollowing,
    follow,
    unfollow,
    followersCount,
    followingCount,
    refetch: fetchFollows
  };
}

// Hook to get follower count for a specific user
export function useFollowerCount(targetUserId: string | null) {
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!targetUserId) {
      setCount(0);
      return;
    }

    setIsLoading(true);
    supabase
      .from("user_follows")
      .select("*", { count: "exact", head: true })
      .eq("followed_id", targetUserId)
      .then(({ count: c }) => {
        setCount(c || 0);
        setIsLoading(false);
      });
  }, [targetUserId]);

  return { count, isLoading };
}
