import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { pixelKey, type PixelStore, type PixelData } from '@/components/map/hooks/usePixelStore';
import { useTileCache, subscribeToCacheChanges, getVisibleTiles } from './useTileCache';
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

// Realtime connection status
export type RealtimeStatus = 'connected' | 'reconnecting' | 'disconnected';

// Backoff delays for reconnection (ms)
const BACKOFF_DELAYS = [1000, 2000, 5000, 10000];
const MAX_RECONNECT_ATTEMPTS = 10;
const FALLBACK_POLL_INTERVAL = 12000; // 12s
const IDLE_THRESHOLD = 2000; // 2s no activity = idle

const getBackoffDelay = (attempt: number) => 
  BACKOFF_DELAYS[Math.min(attempt, BACKOFF_DELAYS.length - 1)];

export function useSupabasePixels(zoom: number) {
  const [dbPixels, setDbPixels] = useState<PixelStore>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [, forceUpdate] = useState(0); // For cache change re-renders
  
  // Realtime status tracking
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>('disconnected');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const hasRenderedFirstPixels = useRef(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isIdleRef = useRef(true);
  const lastActivityRef = useRef<number>(Date.now());
  const lastViewportRef = useRef<ViewportBounds | null>(null);
  
  const { 
    updateViewport: updateTileViewport, 
    updatePixelInCache, 
    removePixelFromCache,
    abortFetch,
    getCachedPixels,
    getTouchedTiles,
    refetchTiles,
  } = useTileCache();

  // Subscribe to cache changes for immediate re-render after optimistic updates
  useEffect(() => {
    const unsubscribe = subscribeToCacheChanges(() => {
      forceUpdate(v => v + 1);
    });
    return unsubscribe;
  }, []);
  
  // Use ref for zoom to avoid recreating fetch when zoom changes
  const zoomRef = useRef(zoom);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  // Mark activity (for idle detection)
  const markActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    isIdleRef.current = false;
  }, []);

  // Check idle status
  const checkIdle = useCallback(() => {
    const timeSinceActivity = Date.now() - lastActivityRef.current;
    isIdleRef.current = timeSinceActivity >= IDLE_THRESHOLD;
    return isIdleRef.current;
  }, []);

  // Setup realtime subscription with reconnection logic
  const setupRealtimeSubscription = useCallback(() => {
    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    console.log('[Realtime] Setting up subscription, attempt:', reconnectAttempts);
    
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
          console.log('[Realtime] Update received:', payload.eventType);
          
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
      .subscribe((status, err) => {
        console.log('[Realtime] Subscription status:', status, err ? `Error: ${err.message}` : '');
        
        if (status === 'SUBSCRIBED') {
          setRealtimeStatus('connected');
          setReconnectAttempts(0);
          console.log('[Realtime] Connected successfully');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[Realtime] Connection error, scheduling reconnect');
          setRealtimeStatus('reconnecting');
          scheduleReconnect();
        } else if (status === 'CLOSED') {
          console.warn('[Realtime] Channel closed');
          // Only go to disconnected if we've exhausted retries
          if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            setRealtimeStatus('disconnected');
          } else {
            setRealtimeStatus('reconnecting');
            scheduleReconnect();
          }
        }
      });

    channelRef.current = channel;
  }, [updatePixelInCache, removePixelFromCache, reconnectAttempts]);

  // Schedule reconnection with backoff
  const scheduleReconnect = useCallback(() => {
    // Clear any existing timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.warn('[Realtime] Max reconnect attempts reached, giving up');
      setRealtimeStatus('disconnected');
      return;
    }

    const delay = getBackoffDelay(reconnectAttempts);
    console.log(`[Realtime] Scheduling reconnect in ${delay}ms (attempt ${reconnectAttempts + 1})`);

    reconnectTimeoutRef.current = setTimeout(() => {
      setReconnectAttempts(prev => prev + 1);
      setupRealtimeSubscription();
    }, delay);
  }, [reconnectAttempts, setupRealtimeSubscription]);

  // Initial realtime setup
  useEffect(() => {
    setupRealtimeSubscription();

    return () => {
      console.log('[Realtime] Cleaning up subscription');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []); // Only run once on mount

  // Fallback polling when disconnected
  useEffect(() => {
    // Clear existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    // Only poll when not connected
    if (realtimeStatus === 'connected') {
      console.log('[Polling] Realtime connected, stopping fallback polling');
      return;
    }

    console.log('[Polling] Starting fallback polling (12s interval)');
    
    pollingIntervalRef.current = setInterval(() => {
      // Only poll when idle and we have a viewport
      if (!checkIdle()) {
        console.log('[Polling] User active, skipping poll');
        return;
      }

      if (!lastViewportRef.current) {
        console.log('[Polling] No viewport, skipping poll');
        return;
      }

      // Check zoom level
      if (zoomRef.current < 12) {
        return;
      }

      console.log('[Polling] Fetching viewport tiles (fallback)');
      const tiles = getVisibleTiles(lastViewportRef.current);
      refetchTiles(tiles.map(t => ({ tx: t.tx, ty: t.ty })));
    }, FALLBACK_POLL_INTERVAL);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [realtimeStatus, refetchTiles, checkIdle]);

  // Debounced viewport update using tile cache
  const updateViewport = useCallback((bounds: ViewportBounds) => {
    // Mark activity
    markActivity();
    
    // Store for fallback polling
    lastViewportRef.current = bounds;

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
  }, [updateTileViewport, abortFetch, markActivity]);

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
  // Returns touched tile coords for reconciliation
  const removePixels = useCallback((coords: Array<{ x: number; y: number }>): Array<{ tx: number; ty: number }> => {
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
    
    // Return touched tiles for reconciliation
    return getTouchedTiles(coords);
  }, [removePixelFromCache, getTouchedTiles]);

  // Add pixels optimistically (for PAINT mode)
  // Returns touched tile coords for reconciliation
  const addPixels = useCallback((pixelsToAdd: Array<{ x: number; y: number; color: string }>): Array<{ tx: number; ty: number }> => {
    pixelsToAdd.forEach(({ x, y, color }) => {
      updatePixelInCache(x, y, color);
    });
    setDbPixels((prev) => {
      const next = new Map(prev);
      pixelsToAdd.forEach(({ x, y, color }) => {
        next.set(pixelKey(x, y), { color });
      });
      return next;
    });
    
    // Return touched tiles for reconciliation
    return getTouchedTiles(pixelsToAdd);
  }, [updatePixelInCache, getTouchedTiles]);

  // Reconcile tiles with server data (call after commit success)
  const reconcileTiles = useCallback(async (tileCoords: Array<{ tx: number; ty: number }>) => {
    if (tileCoords.length === 0) return;
    
    // Background refetch - don't block UI
    try {
      await refetchTiles(tileCoords);
    } catch (err) {
      // Silent fail - optimistic update is already visible
      console.warn('[reconcileTiles] Background refetch failed:', err);
    }
  }, [refetchTiles]);

  return {
    dbPixels,
    isLoading,
    updateViewport,
    paintPixelToDb,
    removePixels,
    addPixels,
    reconcileTiles,
    // Realtime status for debug display
    realtimeStatus,
    reconnectAttempts,
  };
}
