import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface UrlPosition {
  lat: number;
  lng: number;
  zoom: number;
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

    if (lat && lng) {
      const parsedLat = parseFloat(lat);
      const parsedLng = parseFloat(lng);
      
      // Validate coordinates
      if (!isNaN(parsedLat) && !isNaN(parsedLng) && 
          Math.abs(parsedLat) <= 90 && Math.abs(parsedLng) <= 180) {
        return {
          lat: parsedLat,
          lng: parsedLng,
          zoom: z ? parseFloat(z) : 8,
        };
      }
    }
    return null;
  }, [searchParams]);

  /**
   * Update URL with current map position
   * Uses replace to avoid polluting browser history
   */
  const setUrlPosition = useCallback((lat: number, lng: number, zoom: number) => {
    setSearchParams({
      lat: lat.toFixed(5),
      lng: lng.toFixed(5),
      z: zoom.toFixed(1),
    }, { replace: true });
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
