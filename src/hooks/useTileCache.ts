import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DATA_TILE_SIZE, tileKey, pixelToTile } from '@/lib/pixelGrid';
import { pixelKey, type PixelStore, type PixelData } from '@/components/map/hooks/usePixelStore';
import { markFetchStart, markFetchEnd, updateTileCounts } from '@/lib/perfMetrics';

interface TileCoord {
  tx: number;
  ty: number;
}

interface TileCacheEntry {
  pixels: Map<string, PixelData>;
  fetchedAt: number;
}

interface ViewportBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

// Global tile cache (persists across hook instances)
const MAX_CACHED_TILES = 150;
const tileCache = new Map<string, TileCacheEntry>();
const tileLRU: string[] = []; // Most recently used at end

function touchTile(key: string): void {
  const idx = tileLRU.indexOf(key);
  if (idx > -1) tileLRU.splice(idx, 1);
  tileLRU.push(key);
  
  // Evict oldest tiles if over limit
  while (tileLRU.length > MAX_CACHED_TILES) {
    const oldest = tileLRU.shift();
    if (oldest) tileCache.delete(oldest);
  }
}

function setTileCache(key: string, pixels: Map<string, PixelData>): void {
  tileCache.set(key, { pixels, fetchedAt: Date.now() });
  touchTile(key);
}

function getTileCache(key: string): TileCacheEntry | undefined {
  const entry = tileCache.get(key);
  if (entry) touchTile(key);
  return entry;
}

export function useTileCache() {
  const abortControllerRef = useRef<AbortController | null>(null);
  const pendingFetchRef = useRef<Set<string>>(new Set());

  // Compute visible tiles from viewport bounds with prefetch margin
  const getVisibleTiles = useCallback((bounds: ViewportBounds, margin: number = 1): TileCoord[] => {
    const minTile = pixelToTile(bounds.minX, bounds.minY);
    const maxTile = pixelToTile(bounds.maxX, bounds.maxY);
    
    const tiles: TileCoord[] = [];
    for (let tx = minTile.tx - margin; tx <= maxTile.tx + margin; tx++) {
      for (let ty = minTile.ty - margin; ty <= maxTile.ty + margin; ty++) {
        tiles.push({ tx, ty });
      }
    }
    return tiles;
  }, []);

  // Check which tiles are missing from cache
  const getMissingTiles = useCallback((tiles: TileCoord[]): TileCoord[] => {
    return tiles.filter(t => {
      const key = tileKey(t.tx, t.ty);
      return !tileCache.has(key) && !pendingFetchRef.current.has(key);
    });
  }, []);

  // Fetch tiles from edge function
  const fetchTiles = useCallback(async (tiles: TileCoord[]): Promise<boolean> => {
    if (tiles.length === 0) return true;
    
    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    // Mark tiles as pending
    const tileKeys = tiles.map(t => tileKey(t.tx, t.ty));
    tileKeys.forEach(k => pendingFetchRef.current.add(k));
    
    const fetchStart = markFetchStart();
    
    try {
      const { data, error } = await supabase.functions.invoke('pixels-fetch-tiles', {
        body: { 
          tiles: tiles.map(t => ({ tx: t.tx, ty: t.ty })),
          fields: 'render'
        },
      });

      if (error) {
        if (error.message?.includes('aborted')) return false;
        console.error('Error fetching tiles:', error);
        return false;
      }

      markFetchEnd(fetchStart);

      // Parse response and populate cache
      const tilesData = data?.tiles as Record<string, Array<{ x: number; y: number; color: string }>> | undefined;
      
      if (tilesData) {
        Object.entries(tilesData).forEach(([key, pixels]) => {
          const pixelMap = new Map<string, PixelData>();
          pixels.forEach(p => {
            pixelMap.set(pixelKey(p.x, p.y), { color: p.color });
          });
          setTileCache(key, pixelMap);
        });
      }
      
      // Also cache empty tiles to avoid re-fetching
      tileKeys.forEach(key => {
        if (!tileCache.has(key)) {
          setTileCache(key, new Map());
        }
      });

      return true;
    } catch (err) {
      if ((err as Error).name === 'AbortError') return false;
      console.error('Unexpected error fetching tiles:', err);
      return false;
    } finally {
      // Clear pending status
      tileKeys.forEach(k => pendingFetchRef.current.delete(k));
    }
  }, []);

  // Get all cached pixels as a merged store
  const getCachedPixels = useCallback((visibleTiles?: TileCoord[]): PixelStore => {
    const merged = new Map<string, PixelData>();
    
    // If visible tiles specified, only get those (+ cached neighbors)
    const tilesToMerge = visibleTiles 
      ? visibleTiles.map(t => tileKey(t.tx, t.ty))
      : Array.from(tileCache.keys());
    
    tilesToMerge.forEach(key => {
      const entry = tileCache.get(key);
      if (entry) {
        entry.pixels.forEach((value, pxKey) => {
          merged.set(pxKey, value);
        });
      }
    });
    
    return merged;
  }, []);

  // Update viewport - fetch missing tiles
  const updateViewport = useCallback(async (bounds: ViewportBounds): Promise<PixelStore> => {
    const visibleTiles = getVisibleTiles(bounds, 1);
    const missingTiles = getMissingTiles(visibleTiles);
    
    // Update metrics
    updateTileCounts(visibleTiles.length, tileCache.size);
    
    if (missingTiles.length > 0) {
      await fetchTiles(missingTiles);
    }
    
    return getCachedPixels(visibleTiles);
  }, [getVisibleTiles, getMissingTiles, fetchTiles, getCachedPixels]);

  // Abort any pending fetch
  const abortFetch = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  // Invalidate a specific tile (for realtime updates)
  const invalidateTile = useCallback((x: number, y: number) => {
    const { tx, ty } = pixelToTile(x, y);
    const key = tileKey(tx, ty);
    tileCache.delete(key);
    const idx = tileLRU.indexOf(key);
    if (idx > -1) tileLRU.splice(idx, 1);
  }, []);

  // Update a pixel in cache (for realtime updates)
  const updatePixelInCache = useCallback((x: number, y: number, color: string) => {
    const { tx, ty } = pixelToTile(x, y);
    const key = tileKey(tx, ty);
    const entry = tileCache.get(key);
    if (entry) {
      entry.pixels.set(pixelKey(x, y), { color });
    }
  }, []);

  // Remove a pixel from cache (for realtime deletes)
  const removePixelFromCache = useCallback((x: number, y: number) => {
    const { tx, ty } = pixelToTile(x, y);
    const key = tileKey(tx, ty);
    const entry = tileCache.get(key);
    if (entry) {
      entry.pixels.delete(pixelKey(x, y));
    }
  }, []);

  return {
    updateViewport,
    getCachedPixels,
    abortFetch,
    invalidateTile,
    updatePixelInCache,
    removePixelFromCache,
    getCacheSize: () => tileCache.size,
  };
}
