import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { pixelToLngLat } from '@/lib/coordinates';

// In-memory cache to avoid repeated calls for the same pixel
const addressCache = new Map<string, string | null>();

export function useReverseGeocode(x: number | undefined, y: number | undefined) {
  const [address, setAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (x === undefined || y === undefined) {
      setAddress(null);
      return;
    }

    const key = `${x}:${y}`;

    // Check cache first
    if (addressCache.has(key)) {
      setAddress(addressCache.get(key)!);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    const { lng, lat } = pixelToLngLat(x, y);

    supabase.functions.invoke('reverse-geocode', {
      body: { lat, lng },
    }).then(({ data, error }) => {
      if (cancelled) return;
      const resolved = error ? null : (data?.address ?? null);
      addressCache.set(key, resolved);
      setAddress(resolved);
    }).finally(() => {
      if (!cancelled) setIsLoading(false);
    });

    return () => { cancelled = true; };
  }, [x, y]);

  return { address, isLoading };
}
