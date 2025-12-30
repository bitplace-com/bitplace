import { useState, useCallback } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';

export interface PixelData {
  color: string;
}

export type PixelStore = Map<string, PixelData>;

const MAX_ZOOM = 22;

export function pixelKey(x: number, y: number): string {
  return `${x}:${y}`;
}

export function parsePixelKey(key: string): { x: number; y: number } {
  const [x, y] = key.split(':').map(Number);
  return { x, y };
}

// Convert screen point to pixel coordinates at MAX_ZOOM
export function screenToPixel(
  screenX: number,
  screenY: number,
  map: MapLibreMap
): { x: number; y: number } {
  const lngLat = map.unproject([screenX, screenY]);
  // Project to world coordinates at MAX_ZOOM
  const worldSize = Math.pow(2, MAX_ZOOM) * 256;
  const x = Math.floor(((lngLat.lng + 180) / 360) * worldSize);
  const y = Math.floor(
    ((1 - Math.log(Math.tan((lngLat.lat * Math.PI) / 180) + 1 / Math.cos((lngLat.lat * Math.PI) / 180)) / Math.PI) / 2) * worldSize
  );
  return { x, y };
}

// Convert pixel coordinates back to screen position
export function pixelToScreen(
  pixelX: number,
  pixelY: number,
  map: MapLibreMap
): { x: number; y: number } {
  const worldSize = Math.pow(2, MAX_ZOOM) * 256;
  const lng = (pixelX / worldSize) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * pixelY) / worldSize;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  const point = map.project([lng, lat]);
  return { x: point.x, y: point.y };
}

// Get pixel size in screen coordinates at current zoom
export function getPixelScreenSize(map: MapLibreMap): number {
  const zoom = map.getZoom();
  return Math.pow(2, zoom - MAX_ZOOM) * 256;
}

export function usePixelStore() {
  const [pixels, setPixels] = useState<PixelStore>(new Map());

  const paintPixel = useCallback((x: number, y: number, color: string) => {
    setPixels((prev) => {
      const next = new Map(prev);
      next.set(pixelKey(x, y), { color });
      return next;
    });
  }, []);

  const getPixel = useCallback(
    (x: number, y: number): PixelData | undefined => {
      return pixels.get(pixelKey(x, y));
    },
    [pixels]
  );

  const clearPixels = useCallback(() => {
    setPixels(new Map());
  }, []);

  return {
    pixels,
    paintPixel,
    getPixel,
    clearPixels,
  };
}
