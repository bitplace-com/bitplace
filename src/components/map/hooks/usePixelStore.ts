import { useState, useCallback } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { lngLatToGridInt, gridIntToLngLat, getCellSize } from '@/lib/pixelGrid';

export interface PixelData {
  color: string;
}

export type PixelStore = Map<string, PixelData>;

export function pixelKey(x: number, y: number): string {
  return `${x}:${y}`;
}

export function parsePixelKey(key: string): { x: number; y: number } {
  const [x, y] = key.split(':').map(Number);
  return { x, y };
}

/**
 * Convert screen point to grid pixel coordinates using GRID_ZOOM=12 system
 */
export function screenToPixel(
  screenX: number,
  screenY: number,
  map: MapLibreMap
): { x: number; y: number } {
  const lngLat = map.unproject([screenX, screenY]);
  return lngLatToGridInt(lngLat.lng, lngLat.lat);
}

/**
 * Convert grid pixel coordinates back to screen position
 * Returns the top-left corner of the pixel cell
 */
export function pixelToScreen(
  pixelX: number,
  pixelY: number,
  map: MapLibreMap
): { x: number; y: number } {
  // Get the top-left corner of the pixel (not center)
  const { lng, lat } = gridIntToLngLat(pixelX, pixelY);
  // Adjust from center to top-left by offsetting by half cell
  const { lng: lngTL, lat: latTL } = gridIntToLngLat(pixelX - 0.5, pixelY - 0.5);
  const point = map.project([lngTL + (lng - lngTL), latTL + (lat - latTL)]);
  return { x: point.x, y: point.y };
}

/**
 * Get pixel cell size in CSS pixels at current zoom
 */
export function getPixelScreenSize(map: MapLibreMap): number {
  return getCellSize(map.getZoom());
}

export function usePixelStore() {
  const [localPixels, setLocalPixels] = useState<PixelStore>(new Map());

  const paintPixel = useCallback((x: number, y: number, color: string) => {
    setLocalPixels((prev) => {
      const next = new Map(prev);
      next.set(pixelKey(x, y), { color });
      return next;
    });
  }, []);

  const getPixel = useCallback(
    (x: number, y: number): PixelData | undefined => {
      return localPixels.get(pixelKey(x, y));
    },
    [localPixels]
  );

  const clearPixels = useCallback(() => {
    setLocalPixels(new Map());
  }, []);

  // Merge database pixels with local pixels (local takes priority for optimistic updates)
  const mergePixels = useCallback((dbPixels: PixelStore): PixelStore => {
    const merged = new Map(dbPixels);
    localPixels.forEach((value, key) => {
      merged.set(key, value);
    });
    return merged;
  }, [localPixels]);

  // Clear a local pixel after it's confirmed in DB
  const confirmPixel = useCallback((x: number, y: number) => {
    setLocalPixels((prev) => {
      const next = new Map(prev);
      next.delete(pixelKey(x, y));
      return next;
    });
  }, []);

  return {
    localPixels,
    paintPixel,
    getPixel,
    clearPixels,
    mergePixels,
    confirmPixel,
  };
}
