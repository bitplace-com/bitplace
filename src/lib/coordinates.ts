/**
 * Coordinate conversion utilities for Bitplace pixel grid system
 * Uses WebMercator projection at MAX_ZOOM=22
 */

const MAX_ZOOM = 22;
const WORLD_SIZE = Math.pow(2, MAX_ZOOM) * 256;

/**
 * Convert pixel coordinates to geographic coordinates (lng/lat)
 */
export function pixelToLngLat(x: number, y: number): { lng: number; lat: number } {
  const lng = (x / WORLD_SIZE) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / WORLD_SIZE;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { lng, lat };
}

/**
 * Convert geographic coordinates to pixel coordinates
 */
export function lngLatToPixel(lng: number, lat: number): { x: number; y: number } {
  const x = Math.floor(((lng + 180) / 360) * WORLD_SIZE);
  const y = Math.floor(
    ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 
      1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * WORLD_SIZE
  );
  return { x, y };
}

/**
 * Parsed search input result types
 */
export type ParsedInput = 
  | { type: 'latlng'; lat: number; lng: number }
  | { type: 'pixel'; x: number; y: number }
  | { type: 'place'; query: string }
  | { type: 'invalid' };

/**
 * Parse user search input to determine type and extract coordinates
 * Supports:
 * - lat,lng format (e.g., "41.9028, 12.4964")
 * - x:y or x,y pixel format for large integers (e.g., "12345:67890")
 * - Free-text place names (e.g., "Tokyo")
 */
export function parseSearchInput(input: string): ParsedInput {
  const trimmed = input.trim();
  if (!trimmed) return { type: 'invalid' };

  // Try x:y pixel format first (e.g., "12345:67890" or "12345x67890")
  const pixelColonMatch = trimmed.match(/^(\d+)\s*[:x]\s*(\d+)$/i);
  if (pixelColonMatch) {
    return { 
      type: 'pixel', 
      x: parseInt(pixelColonMatch[1]), 
      y: parseInt(pixelColonMatch[2]) 
    };
  }

  // Try comma-separated numbers (could be lat,lng or pixel x,y)
  const commaMatch = trimmed.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
  if (commaMatch) {
    const a = parseFloat(commaMatch[1]);
    const b = parseFloat(commaMatch[2]);
    
    // If both are valid lat/lng ranges, treat as geographic coordinates
    if (Math.abs(a) <= 90 && Math.abs(b) <= 180) {
      return { type: 'latlng', lat: a, lng: b };
    }
    
    // If both are large positive integers, treat as pixel coordinates
    if (a >= 0 && b >= 0 && Number.isInteger(a) && Number.isInteger(b)) {
      return { type: 'pixel', x: a, y: b };
    }
  }

  // Otherwise treat as place name search
  return { type: 'place', query: trimmed };
}

/**
 * Format coordinates for display
 */
export function formatCoords(lat: number, lng: number): string {
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

/**
 * Format pixel coordinates for display
 */
export function formatPixel(x: number, y: number): string {
  return `${x}:${y}`;
}
