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
      const { data, error } = await supabase
        .from('pixels')
        .select('expires_at')
        .eq('owner_user_id', userId)
        .eq('is_virtual_stake', true)
        .not('expires_at', 'is', null);

      if (error) {
        console.error('[useVpeRenew] fetch error:', error);
        setIsLoading(false);
        return;
      }

      const now = Date.now();
      const h6 = 6 * 60 * 60 * 1000;
      const h24 = 24 * 60 * 60 * 1000;
      const h48 = 48 * 60 * 60 * 1000;

      let urgent = 0, soon = 0, upcoming = 0, safe = 0;
      let minExpiry = Infinity;

      for (const row of data || []) {
        const expiryMs = new Date(row.expires_at!).getTime();
        const remaining = expiryMs - now;
        if (expiryMs < minExpiry) minExpiry = expiryMs;
        if (remaining < h6) urgent++;
        else if (remaining < h24) soon++;
        else if (remaining < h48) upcoming++;
        else safe++;
      }

      setBatches({ urgent, soon, upcoming, safe });
      setTotalVpePixels(data?.length || 0);
      setEarliestExpiry(minExpiry < Infinity ? new Date(minExpiry) : null);
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
