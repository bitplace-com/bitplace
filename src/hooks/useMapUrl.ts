import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface UrlPosition {
  lat: number;
  lng: number;
  zoom: number;
  pixelX?: number;
  pixelY?: number;
}

export function useMapUrl() {
  const [searchParams, setSearchParams] = useSearchParams();

  /**
   * Read initial position from URL query params
   * Returns null if no valid params are present
   */
  const getUrlPosition = useCallback((): UrlPosition | null => {
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const z = searchParams.get('z');
    const px = searchParams.get('px');
    const py = searchParams.get('py');

    if (lat && lng) {
      const parsedLat = parseFloat(lat);
      const parsedLng = parseFloat(lng);
      
      // Validate coordinates
      if (!isNaN(parsedLat) && !isNaN(parsedLng) && 
          Math.abs(parsedLat) <= 90 && Math.abs(parsedLng) <= 180) {
        const result: UrlPosition = {
          lat: parsedLat,
          lng: parsedLng,
          zoom: z ? parseFloat(z) : 8,
        };
        
        // Add pixel coords if present
        if (px && py) {
          const parsedPx = parseInt(px, 10);
          const parsedPy = parseInt(py, 10);
          if (!isNaN(parsedPx) && !isNaN(parsedPy) && parsedPx >= 0 && parsedPy >= 0) {
            result.pixelX = parsedPx;
            result.pixelY = parsedPy;
          }
        }
        
        return result;
      }
    }
    return null;
  }, [searchParams]);

  /**
   * Update URL with current map position
   * Uses replace to avoid polluting browser history
   */
  const setUrlPosition = useCallback((lat: number, lng: number, zoom: number, pixelX?: number, pixelY?: number) => {
    const params: Record<string, string> = {
      lat: lat.toFixed(5),
      lng: lng.toFixed(5),
      z: zoom.toFixed(1),
    };
    if (pixelX !== undefined && pixelY !== undefined) {
      params.px = String(pixelX);
      params.py = String(pixelY);
    }
    setSearchParams(params, { replace: true });
  }, [setSearchParams]);

  /**
   * Clear URL params
   */
  const clearUrlPosition = useCallback(() => {
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  return { 
    getUrlPosition, 
    setUrlPosition,
    clearUrlPosition,
  };
}
