import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SESSION_TOKEN_KEY = 'bitplace_session_token';
const REFRESH_INTERVAL_MS = 120_000; // 2 minutes (reduced from 45s since we have realtime now)

const getSessionToken = () => localStorage.getItem(SESSION_TOKEN_KEY);

export interface StatusAlert {
  id: string;
  category: 'lost' | 'under_attack' | 'contested';
  x: number;
  y: number;
  timestamp?: string;
  details?: {
    atkTotal?: number;
    defTotal?: number;
    side?: 'DEF' | 'ATK';
    actorId?: string;
  };
}

interface UseStatusAlertsResult {
  pixelsLost: StatusAlert[];
  pixelsUnderAttack: StatusAlert[];
  contestedContributions: StatusAlert[];
  totalCount: number;
  isLoading: boolean;
  hasNewAlerts: boolean;
  refresh: () => Promise<void>;
  markLostAsRead: (notificationId: string) => Promise<void>;
  clearNewAlertFlag: () => void;
}

export function useStatusAlerts(userId: string | undefined): UseStatusAlertsResult {
  const [pixelsLost, setPixelsLost] = useState<StatusAlert[]>([]);
  const [pixelsUnderAttack, setPixelsUnderAttack] = useState<StatusAlert[]>([]);
  const [contestedContributions, setContestedContributions] = useState<StatusAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasNewAlerts, setHasNewAlerts] = useState(false);
  const prevCountRef = useRef({ lost: 0, attack: 0, contested: 0 });
  const fetchAlerts = useCallback(async () => {
    if (!userId) {
      setPixelsLost([]);
      setPixelsUnderAttack([]);
      setContestedContributions([]);
      return;
    }

    setIsLoading(true);
    try {
      // 1. Pixels Lost - from notifications with type PIXEL_TAKEOVER (unread only)
      const { data: lostNotifs } = await supabase
        .from('notifications')
        .select('id, meta, created_at')
        .eq('user_id', userId)
        .eq('type', 'PIXEL_TAKEOVER')
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(50);

      const lost: StatusAlert[] = (lostNotifs || [])
        .filter(n => n.meta && typeof n.meta === 'object' && 'pixel_x' in n.meta && 'pixel_y' in n.meta)
        .map(n => ({
          id: n.id,
          category: 'lost' as const,
          x: (n.meta as Record<string, any>).pixel_x,
          y: (n.meta as Record<string, any>).pixel_y,
          timestamp: n.created_at,
          details: {
            actorId: (n.meta as Record<string, any>).actor_id,
          },
        }));

      // 2. Pixels Under Attack - pixels owned by user with atk_total > 0
      const { data: attackedPixels } = await supabase
        .from('pixels')
        .select('id, x, y, atk_total, updated_at')
        .eq('owner_user_id', userId)
        .gt('atk_total', 0)
        .order('updated_at', { ascending: false })
        .limit(50);

      const underAttack: StatusAlert[] = (attackedPixels || []).map(p => ({
        id: `attack-${p.id}`,
        category: 'under_attack' as const,
        x: Number(p.x),
        y: Number(p.y),
        timestamp: p.updated_at,
        details: {
          atkTotal: Number(p.atk_total),
        },
      }));

      // 3. Contested Contributions - user's DEF on pixels with ATK, or user's ATK on pixels with DEF
      const { data: userContribs } = await supabase
        .from('pixel_contributions')
        .select('id, pixel_id, side, amount_pe')
        .eq('user_id', userId);

      if (userContribs && userContribs.length > 0) {
        const pixelIds = [...new Set(userContribs.map(c => c.pixel_id))];
        
        const { data: pixelData } = await supabase
          .from('pixels')
          .select('id, x, y, def_total, atk_total, updated_at')
          .in('id', pixelIds);

        const pixelMap = new Map(
          (pixelData || []).map(p => [p.id, p])
        );

        const contested: StatusAlert[] = [];
        
        for (const contrib of userContribs) {
          const pixel = pixelMap.get(contrib.pixel_id);
          if (!pixel) continue;

          const isContested = 
            (contrib.side === 'DEF' && Number(pixel.atk_total) > 0) ||
            (contrib.side === 'ATK' && Number(pixel.def_total) > 0);

          if (isContested) {
            contested.push({
              id: `contested-${contrib.id}`,
              category: 'contested',
              x: Number(pixel.x),
              y: Number(pixel.y),
              timestamp: pixel.updated_at,
              details: {
                side: contrib.side as 'DEF' | 'ATK',
                defTotal: Number(pixel.def_total),
                atkTotal: Number(pixel.atk_total),
              },
            });
          }
        }

        // Remove duplicates by pixel coordinates
        const uniqueContested = contested.filter(
          (item, index, self) =>
            index === self.findIndex(c => c.x === item.x && c.y === item.y)
        );

        setContestedContributions(uniqueContested.slice(0, 50));
      } else {
        setContestedContributions([]);
      }

      setPixelsLost(lost);
      setPixelsUnderAttack(underAttack);
    } catch (err) {
      console.error('[useStatusAlerts] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Mark a "lost" notification as read
  const markLostAsRead = useCallback(async (notificationId: string) => {
    const token = getSessionToken();
    if (!token) return;

    try {
      await supabase.functions.invoke('notifications-manage', {
        body: { action: 'mark-read', notificationIds: [notificationId] },
        headers: { Authorization: `Bearer ${token}` },
      });

      // Remove from local state
      setPixelsLost(prev => prev.filter(p => p.id !== notificationId));
    } catch (err) {
      console.error('[useStatusAlerts] Mark read error:', err);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Periodic refresh (fallback, reduced interval since we have realtime)
  useEffect(() => {
    if (!userId) return;

    const interval = setInterval(fetchAlerts, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [userId, fetchAlerts]);

  // Real-time subscription for notifications (PIXEL_TAKEOVER)
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`status-alerts:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const notification = payload.new as {
            id: string;
            type: string;
            meta: Record<string, unknown> | null;
            created_at: string;
          };
          
          // Handle PIXEL_TAKEOVER in real-time
          if (notification.type === 'PIXEL_TAKEOVER' && notification.meta) {
            const meta = notification.meta as { pixel_x?: number; pixel_y?: number; actor_id?: string };
            if (meta.pixel_x !== undefined && meta.pixel_y !== undefined) {
              setPixelsLost(prev => [{
                id: notification.id,
                category: 'lost' as const,
                x: meta.pixel_x!,
                y: meta.pixel_y!,
                timestamp: notification.created_at,
                details: { actorId: meta.actor_id },
              }, ...prev].slice(0, 50));
              setHasNewAlerts(true);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Real-time subscription for pixel updates (attacks on owned pixels)
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`status-pixels:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pixels',
        },
        (payload) => {
          const newPixel = payload.new as {
            id: number;
            x: number;
            y: number;
            owner_user_id: string | null;
            atk_total: number;
            updated_at: string;
          };
          
          // If this pixel is owned by user and has ATK
          if (newPixel.owner_user_id === userId && Number(newPixel.atk_total) > 0) {
            setPixelsUnderAttack(prev => {
              const exists = prev.some(p => p.id === `attack-${newPixel.id}`);
              if (exists) {
                // Update existing
                return prev.map(p => 
                  p.id === `attack-${newPixel.id}` 
                    ? { ...p, details: { ...p.details, atkTotal: Number(newPixel.atk_total) }, timestamp: newPixel.updated_at }
                    : p
                );
              } else {
                // Add new
                setHasNewAlerts(true);
                return [{
                  id: `attack-${newPixel.id}`,
                  category: 'under_attack' as const,
                  x: Number(newPixel.x),
                  y: Number(newPixel.y),
                  timestamp: newPixel.updated_at,
                  details: { atkTotal: Number(newPixel.atk_total) },
                }, ...prev].slice(0, 50);
              }
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Check for new alerts
  useEffect(() => {
    const currentCounts = {
      lost: pixelsLost.length,
      attack: pixelsUnderAttack.length,
      contested: contestedContributions.length,
    };
    
    if (
      currentCounts.lost > prevCountRef.current.lost ||
      currentCounts.attack > prevCountRef.current.attack ||
      currentCounts.contested > prevCountRef.current.contested
    ) {
      setHasNewAlerts(true);
    }
    
    prevCountRef.current = currentCounts;
  }, [pixelsLost.length, pixelsUnderAttack.length, contestedContributions.length]);

  const clearNewAlertFlag = useCallback(() => {
    setHasNewAlerts(false);
  }, []);
  const totalCount = pixelsLost.length + pixelsUnderAttack.length + contestedContributions.length;

  return {
    pixelsLost,
    pixelsUnderAttack,
    contestedContributions,
    totalCount,
    isLoading,
    hasNewAlerts,
    refresh: fetchAlerts,
    markLostAsRead,
    clearNewAlertFlag,
  };
}
