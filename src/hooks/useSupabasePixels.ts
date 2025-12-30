import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { pixelKey, type PixelStore, type PixelData } from '@/components/map/hooks/usePixelStore';

interface ViewportBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

interface DbPixel {
  id: number;
  x: number;
  y: number;
  color: string;
  owner_user_id: string | null;
  owner_stake_pe: number;
}

export function useSupabasePixels(zoom: number) {
  const [dbPixels, setDbPixels] = useState<PixelStore>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const lastBoundsRef = useRef<ViewportBounds | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch pixels within viewport bounds
  const fetchViewportPixels = useCallback(async (bounds: ViewportBounds) => {
    if (zoom < 12) {
      setDbPixels(new Map());
      return;
    }

    // Skip if bounds haven't changed significantly
    if (lastBoundsRef.current) {
      const last = lastBoundsRef.current;
      const threshold = 1000; // pixel threshold for refetch
      if (
        Math.abs(bounds.minX - last.minX) < threshold &&
        Math.abs(bounds.maxX - last.maxX) < threshold &&
        Math.abs(bounds.minY - last.minY) < threshold &&
        Math.abs(bounds.maxY - last.maxY) < threshold
      ) {
        return;
      }
    }

    setIsLoading(true);
    lastBoundsRef.current = bounds;

    try {
      console.log('Fetching pixels for bounds:', bounds);
      
      const { data, error } = await supabase
        .from('pixels')
        .select('id, x, y, color, owner_user_id, owner_stake_pe')
        .gte('x', bounds.minX)
        .lte('x', bounds.maxX)
        .gte('y', bounds.minY)
        .lte('y', bounds.maxY)
        .limit(10000);

      if (error) {
        console.error('Error fetching pixels:', error);
        return;
      }

      console.log(`Fetched ${data?.length || 0} pixels`);

      const pixelMap = new Map<string, PixelData>();
      (data as DbPixel[] || []).forEach((pixel) => {
        pixelMap.set(pixelKey(pixel.x, pixel.y), { color: pixel.color });
      });

      setDbPixels(pixelMap);
    } catch (err) {
      console.error('Unexpected error fetching pixels:', err);
    } finally {
      setIsLoading(false);
    }
  }, [zoom]);

  // Debounced viewport update
  const updateViewport = useCallback((bounds: ViewportBounds) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchViewportPixels(bounds);
    }, 200);
  }, [fetchViewportPixels]);

  // Subscribe to realtime changes
  useEffect(() => {
    console.log('Setting up realtime subscription');
    
    const channel = supabase
      .channel('pixels-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pixels'
        },
        (payload) => {
          console.log('Realtime update:', payload);
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const pixel = payload.new as DbPixel;
            setDbPixels((prev) => {
              const next = new Map(prev);
              next.set(pixelKey(pixel.x, pixel.y), { color: pixel.color });
              return next;
            });
          } else if (payload.eventType === 'DELETE') {
            const pixel = payload.old as DbPixel;
            setDbPixels((prev) => {
              const next = new Map(prev);
              next.delete(pixelKey(pixel.x, pixel.y));
              return next;
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    return () => {
      console.log('Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, []);

  // Paint pixel via edge function
  const paintPixelToDb = useCallback(async (x: number, y: number, color: string) => {
    try {
      console.log('Calling paint-pixel-dev:', { x, y, color });
      
      const { data, error } = await supabase.functions.invoke('paint-pixel-dev', {
        body: { x, y, color }
      });

      if (error) {
        console.error('Error painting pixel:', error);
        return false;
      }

      console.log('Paint response:', data);
      return true;
    } catch (err) {
      console.error('Unexpected error painting pixel:', err);
      return false;
    }
  }, []);

  return {
    dbPixels,
    isLoading,
    updateViewport,
    paintPixelToDb,
  };
}
