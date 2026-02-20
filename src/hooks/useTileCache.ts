import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DATA_TILE_SIZE, tileKey, pixelToTile } from '@/lib/pixelGrid';
import { pixelKey, type PixelStore, type PixelData } from '@/components/map/hooks/usePixelStore';
import { markFetchStart, markFetchEnd, updateTileCounts } from '@/lib/perfMetrics';

// Debug flag - enable via localStorage.setItem('DEBUG_TILECACHE', '1')
const isDebugTileCache = (): boolean => {
  try {
    return typeof window !== 'undefined' && localStorage.getItem('DEBUG_TILECACHE') === '1';
  } catch {
    return false;
  }
};

interface TileCoord {
  tx: number;
  ty: number;
}

interface TileCacheEntry {
  pixels: Map<string, PixelData>;
  fetchedAt: number;
  status: 'loaded' | 'optimistic';
  stale: boolean;
  lastUpdatedAt: number;
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

// Global version counter for cache changes - triggers React re-renders
let cacheVersion = 0;
const cacheListeners = new Set<() => void>();

function notifyCacheChanged(): void {
  cacheVersion++;
  cacheListeners.forEach(fn => fn());
}

// Export for hooks to subscribe to cache changes
export function subscribeToCacheChanges(callback: () => void): () => void {
  cacheListeners.add(callback);
  return () => cacheListeners.delete(callback);
}

export function getCacheVersion(): number {
  return cacheVersion;
}

// Get tile entry for a pixel (standalone, not hook) - exported for usePixelDetails
export function getTileEntryForPixel(x: number, y: number): TileCacheEntry | undefined {
  const { tx, ty } = pixelToTile(x, y);
  const key = tileKey(tx, ty);
  return tileCache.get(key);
}

// Check if a pixel's tile is still optimistic/syncing
export function isPixelSyncing(x: number, y: number): boolean {
  const entry = getTileEntryForPixel(x, y);
  if (!entry) return false; // No tile = not syncing, just missing
  return entry.status === 'optimistic' || entry.stale;
}

// Get pixel from tile cache (for fallback color display)
export function getCachedPixelData(x: number, y: number): PixelData | undefined {
  const entry = getTileEntryForPixel(x, y);
  if (!entry) return undefined;
  return entry.pixels.get(pixelKey(x, y));
}

// Get visible tiles for a viewport bounds (standalone export for fallback polling in useSupabasePixels)
export function getVisibleTiles(bounds: ViewportBounds, margin = 1): Array<{ tx: number; ty: number }> {
  const minTile = pixelToTile(bounds.minX, bounds.minY);
  const maxTile = pixelToTile(bounds.maxX, bounds.maxY);
  
  const tiles: Array<{ tx: number; ty: number }> = [];
  for (let tx = minTile.tx - margin; tx <= maxTile.tx + margin; tx++) {
    for (let ty = minTile.ty - margin; ty <= maxTile.ty + margin; ty++) {
      tiles.push({ tx, ty });
    }
  }
  return tiles;
}

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
  tileCache.set(key, { 
    pixels, 
    fetchedAt: Date.now(),
    status: 'loaded',
    stale: false,
    lastUpdatedAt: Date.now(),
  });
  touchTile(key);
  notifyCacheChanged();
}

function getTileCache(key: string): TileCacheEntry | undefined {
  const entry = tileCache.get(key);
  if (entry) touchTile(key);
  return entry;
}

// Create tile entry if missing (for optimistic updates)
function ensureTileEntry(tx: number, ty: number): TileCacheEntry {
  const key = tileKey(tx, ty);
  let entry = tileCache.get(key);
  
  if (!entry) {
    entry = {
      pixels: new Map(),
      fetchedAt: 0,
      status: 'optimistic',
      stale: true,
      lastUpdatedAt: Date.now(),
    };
    tileCache.set(key, entry);
    touchTile(key);
    
    if (isDebugTileCache()) {
      console.debug('[tilecache] created optimistic tile', key);
    }
  }
  
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

  // Check which tiles are missing from cache (includes optimistic-only tiles)
  const getMissingTiles = useCallback((tiles: TileCoord[]): TileCoord[] => {
    return tiles.filter(t => {
      const key = tileKey(t.tx, t.ty);
      if (pendingFetchRef.current.has(key)) return false;
      const entry = tileCache.get(key);
      // Fetch if missing OR if only contains local/optimistic data
      return !entry || entry.status === 'optimistic';
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
          const existingEntry = tileCache.get(key);
          const pixelMap = new Map<string, PixelData>();
          // Start with server pixels
          pixels.forEach(p => {
            pixelMap.set(pixelKey(p.x, p.y), { color: p.color });
          });
          // Overlay optimistic pixels (trial/local) on top of server data
          if (existingEntry && existingEntry.status === 'optimistic') {
            existingEntry.pixels.forEach((pd, pk) => {
              pixelMap.set(pk, pd);
            });
          }
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
    notifyCacheChanged();
  }, []);

  // Update a pixel in cache (for optimistic/realtime updates)
  // Creates tile if missing - never silently fails
  const updatePixelInCache = useCallback((x: number, y: number, color: string) => {
    const { tx, ty } = pixelToTile(x, y);
    const entry = ensureTileEntry(tx, ty);
    const k = pixelKey(x, y);
    const prev = entry.pixels.get(k);
    
    // Merge with previous data, ensuring color is always present
    entry.pixels.set(k, {
      ...prev,
      color,
    });
    
    entry.stale = true;
    entry.lastUpdatedAt = Date.now();
    
    if (isDebugTileCache()) {
      console.debug('[tilecache] updatePixel', { x, y, color, tile: tileKey(tx, ty) });
    }
    
    notifyCacheChanged();
  }, []);

  // Remove a pixel from cache (for optimistic/realtime deletes)
  // Creates tile if missing so deletion is tracked
  const removePixelFromCache = useCallback((x: number, y: number) => {
    const { tx, ty } = pixelToTile(x, y);
    const entry = ensureTileEntry(tx, ty);
    const k = pixelKey(x, y);
    const deleted = entry.pixels.delete(k);
    
    entry.stale = true;
    entry.lastUpdatedAt = Date.now();
    
    if (isDebugTileCache() && deleted) {
      console.debug('[tilecache] removePixel', { x, y, tile: tileKey(tx, ty) });
    }
    
    notifyCacheChanged();
  }, []);

  // Get list of stale tiles that need reconciliation
  const getStaleTiles = useCallback((): Array<{ tx: number; ty: number }> => {
    const stale: Array<{ tx: number; ty: number }> = [];
    tileCache.forEach((entry, key) => {
      if (entry.stale) {
        const [txStr, tyStr] = key.split(':');
        stale.push({ tx: Number(txStr), ty: Number(tyStr) });
      }
    });
    return stale;
  }, []);

  // Calculate tiles touched by pixel coordinates (for reconciliation)
  const getTouchedTiles = useCallback((pixels: Array<{ x: number; y: number }>): Array<{ tx: number; ty: number }> => {
    const tileSet = new Map<string, { tx: number; ty: number }>();
    
    pixels.forEach(({ x, y }) => {
      const { tx, ty } = pixelToTile(x, y);
      const key = tileKey(tx, ty);
      if (!tileSet.has(key)) {
        tileSet.set(key, { tx, ty });
      }
    });
    
    return Array.from(tileSet.values());
  }, []);

  // Force refetch specific tiles from server (for post-commit reconciliation)
  const refetchTiles = useCallback(async (tileCoords: Array<{ tx: number; ty: number }>): Promise<boolean> => {
    if (tileCoords.length === 0) return true;
    
    // Deduplicate tile coords
    const uniqueTiles = Array.from(
      new Map(tileCoords.map(t => [`${t.tx}:${t.ty}`, t])).values()
    );
    
    if (isDebugTileCache()) {
      console.debug('[tilecache] refetchTiles', uniqueTiles.map(t => `${t.tx}:${t.ty}`));
    }
    
    try {
      const { data, error } = await supabase.functions.invoke('pixels-fetch-tiles', {
        body: { 
          tiles: uniqueTiles.map(t => ({ tx: t.tx, ty: t.ty })),
          fields: 'render'
        },
      });

      if (error) {
        console.error('[tilecache] refetchTiles error:', error);
        return false;
      }

      // Merge server data into cache
      const tilesData = data?.tiles as Record<string, Array<{ x: number; y: number; color: string }>> | undefined;
      
      if (tilesData) {
        Object.entries(tilesData).forEach(([key, pixels]) => {
          const entry = tileCache.get(key);
          if (entry) {
            // Server wins - replace all pixels in this tile
            entry.pixels.clear();
            pixels.forEach(p => {
              entry.pixels.set(pixelKey(p.x, p.y), { color: p.color });
            });
            entry.status = 'loaded';
            entry.stale = false;
            entry.fetchedAt = Date.now();
            entry.lastUpdatedAt = Date.now();
          } else {
            // Tile didn't exist - create it
            const pixelMap = new Map<string, PixelData>();
            pixels.forEach(p => {
              pixelMap.set(pixelKey(p.x, p.y), { color: p.color });
            });
            setTileCache(key, pixelMap);
          }
        });
        
        // Also clear stale flag for requested tiles with no pixels (empty tiles)
        uniqueTiles.forEach(t => {
          const key = tileKey(t.tx, t.ty);
          const entry = tileCache.get(key);
          if (entry) {
            entry.status = 'loaded';
            entry.stale = false;
          }
        });
        
        notifyCacheChanged();
      }

      if (isDebugTileCache()) {
        console.debug('[tilecache] refetchTiles complete', { tilesReconciled: uniqueTiles.length });
      }

      return true;
    } catch (err) {
      console.error('[tilecache] refetchTiles exception:', err);
      return false;
    }
  }, []);

  return {
    updateViewport,
    getCachedPixels,
    abortFetch,
    invalidateTile,
    updatePixelInCache,
    removePixelFromCache,
    getStaleTiles,
    getTouchedTiles,
    refetchTiles,
    getCacheSize: () => tileCache.size,
  };
}
