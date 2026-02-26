import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ExpiringBatches {
  urgent: number;   // < 6h remaining
  soon: number;     // 6-24h remaining (renewable)
  upcoming: number; // 24-48h remaining (not yet renewable)
  safe: number;     // 48h+ remaining
}

export interface VpeRenewState {
  expiringBatches: ExpiringBatches;
  renewableCount: number;  // urgent + soon
  totalVpePixels: number;
  earliestExpiry: Date | null;
  isLoading: boolean;
  isRenewing: boolean;
  renewAll: () => Promise<void>;
}

const POLL_INTERVAL = 60_000; // 60s

export function useVpeRenew(userId: string | undefined): VpeRenewState {
  const [batches, setBatches] = useState<ExpiringBatches>({ urgent: 0, soon: 0, upcoming: 0, safe: 0 });
  const [totalVpePixels, setTotalVpePixels] = useState(0);
  const [earliestExpiry, setEarliestExpiry] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRenewing, setIsRenewing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const fetchBatches = useCallback(async () => {
    if (!userId) {
      setBatches({ urgent: 0, soon: 0, upcoming: 0, safe: 0 });
      setTotalVpePixels(0);
      setEarliestExpiry(null);
      return;
    }

    setIsLoading(true);
    try {
      const now = new Date();
      const h6 = new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString();
      const h24 = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
      const h48 = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();

      const baseFilter = (q: any) =>
        q.eq('owner_user_id', userId).eq('is_virtual_stake', true).not('expires_at', 'is', null);

      // All queries in parallel
      const [totalRes, earliestRes, urgentRes, soonRes, upcomingRes] = await Promise.all([
        // Q1: total count
        baseFilter(supabase.from('pixels').select('*', { count: 'exact', head: true })),
        // Q2: earliest expiry
        baseFilter(supabase.from('pixels').select('expires_at')).order('expires_at', { ascending: true }).limit(1),
        // Q3: urgent (< 6h)
        baseFilter(supabase.from('pixels').select('*', { count: 'exact', head: true })).lt('expires_at', h6),
        // Q4: soon (6-24h)
        baseFilter(supabase.from('pixels').select('*', { count: 'exact', head: true })).gte('expires_at', h6).lt('expires_at', h24),
        // Q5: upcoming (24-48h)
        baseFilter(supabase.from('pixels').select('*', { count: 'exact', head: true })).gte('expires_at', h24).lt('expires_at', h48),
      ]);

      const total = totalRes.count ?? 0;
      const urgent = urgentRes.count ?? 0;
      const soon = soonRes.count ?? 0;
      const upcoming = upcomingRes.count ?? 0;
      const safe = total - urgent - soon - upcoming;

      const earliest = earliestRes.data?.[0]?.expires_at
        ? new Date(earliestRes.data[0].expires_at)
        : null;

      setBatches({ urgent, soon, upcoming, safe });
      setTotalVpePixels(total);
      setEarliestExpiry(earliest);
    } catch (err) {
      console.error('[useVpeRenew] exception:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchBatches();
    intervalRef.current = setInterval(fetchBatches, POLL_INTERVAL);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchBatches]);

  const renewAll = useCallback(async () => {
    if (isRenewing) return;
    setIsRenewing(true);

    try {
      const token = localStorage.getItem('bitplace_session_token');
      if (!token) {
        toast.error('Not authenticated');
        return;
      }

      const { data, error } = await supabase.functions.invoke('vpe-renew', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (error) {
        toast.error('Failed to renew pixels');
        console.error('[useVpeRenew] renew error:', error);
        return;
      }

      if (data?.ok) {
        toast.success(`Renewed ${data.renewed} pixel${data.renewed !== 1 ? 's' : ''}`, {
          description: 'Timer reset to 72h for all eligible pixels',
        });
        // Refresh batches immediately
        await fetchBatches();
      }
    } catch (err) {
      console.error('[useVpeRenew] renew exception:', err);
      toast.error('Failed to renew pixels');
    } finally {
      setIsRenewing(false);
    }
  }, [isRenewing, fetchBatches]);

  return {
    expiringBatches: batches,
    renewableCount: batches.urgent + batches.soon,
    totalVpePixels,
    earliestExpiry,
    isLoading,
    isRenewing,
    renewAll,
  };
}
