import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SESSION_TOKEN_KEY = 'bitplace_session_token';
const REFRESH_INTERVAL_MS = 45_000; // 45 seconds

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
  refresh: () => Promise<void>;
  markLostAsRead: (notificationId: string) => Promise<void>;
}

export function useStatusAlerts(userId: string | undefined): UseStatusAlertsResult {
  const [pixelsLost, setPixelsLost] = useState<StatusAlert[]>([]);
  const [pixelsUnderAttack, setPixelsUnderAttack] = useState<StatusAlert[]>([]);
  const [contestedContributions, setContestedContributions] = useState<StatusAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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

  // Periodic refresh
  useEffect(() => {
    if (!userId) return;

    const interval = setInterval(fetchAlerts, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [userId, fetchAlerts]);

  const totalCount = pixelsLost.length + pixelsUnderAttack.length + contestedContributions.length;

  return {
    pixelsLost,
    pixelsUnderAttack,
    contestedContributions,
    totalCount,
    isLoading,
    refresh: fetchAlerts,
    markLostAsRead,
  };
}
