import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { pixelKey, type PixelStore, type PixelData } from '@/components/map/hooks/usePixelStore';
import { useTileCache } from './useTileCache';
import { markFirstPixelsRendered } from '@/lib/perfMetrics';

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
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const hasRenderedFirstPixels = useRef(false);
  
  const { 
    updateViewport: updateTileViewport, 
    updatePixelInCache, 
    removePixelFromCache,
    abortFetch,
  } = useTileCache();
  
  // Use ref for zoom to avoid recreating fetch when zoom changes
  const zoomRef = useRef(zoom);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  // Debounced viewport update using tile cache
  const updateViewport = useCallback((bounds: ViewportBounds) => {
    // Abort any pending fetch when new update comes
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      abortFetch();
    }

    // Reduced debounce for faster response (80ms instead of 200ms)
    debounceRef.current = setTimeout(async () => {
      if (zoomRef.current < 12) {
        setDbPixels(new Map());
        return;
      }

      setIsLoading(true);
      
      try {
        const pixels = await updateTileViewport(bounds);
        setDbPixels(pixels);
        
        // Mark first pixels rendered for perf tracking
        if (!hasRenderedFirstPixels.current && pixels.size > 0) {
          hasRenderedFirstPixels.current = true;
          markFirstPixelsRendered();
        }
      } finally {
        setIsLoading(false);
      }
    }, 80);
  }, [updateTileViewport, abortFetch]);

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
            // Update tile cache
            updatePixelInCache(pixel.x, pixel.y, pixel.color);
            // Update local state
            setDbPixels((prev) => {
              const next = new Map(prev);
              next.set(pixelKey(pixel.x, pixel.y), { color: pixel.color });
              return next;
            });
          } else if (payload.eventType === 'DELETE') {
            const pixel = payload.old as DbPixel;
            // Update tile cache
            removePixelFromCache(pixel.x, pixel.y);
            // Update local state
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
  }, [updatePixelInCache, removePixelFromCache]);

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

  // Remove pixels optimistically (for ERASE mode)
  const removePixels = useCallback((coords: Array<{ x: number; y: number }>) => {
    coords.forEach(({ x, y }) => {
      removePixelFromCache(x, y);
    });
    setDbPixels((prev) => {
      const next = new Map(prev);
      coords.forEach(({ x, y }) => {
        next.delete(pixelKey(x, y));
      });
      return next;
    });
  }, [removePixelFromCache]);

  return {
    dbPixels,
    isLoading,
    updateViewport,
    paintPixelToDb,
    removePixels,
  };
}
