/**
 * Coordinate conversion utilities for Bitplace pixel grid system
 * Uses the pixelGrid module for GRID_ZOOM=12 based coordinates
 */

import { 
  GRID_SIZE, 
  lngLatToGridInt, 
  gridIntToLngLat 
} from './pixelGrid';

/**
 * Convert pixel coordinates to geographic coordinates (lng/lat)
 * Wrapper around gridIntToLngLat for backwards compatibility
 */
export function pixelToLngLat(x: number, y: number): { lng: number; lat: number } {
  return gridIntToLngLat(x, y);
}

/**
 * Convert geographic coordinates to pixel coordinates
 * Wrapper around lngLatToGridInt for backwards compatibility
 */
export function lngLatToPixel(lng: number, lat: number): { x: number; y: number } {
  return lngLatToGridInt(lng, lat);
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
 * - x:y or x,y pixel format for integers (e.g., "12345:67890")
 * - Free-text place names (e.g., "Tokyo")
 */
export function parseSearchInput(input: string): ParsedInput {
  const trimmed = input.trim();
  if (!trimmed) return { type: 'invalid' };

  // Try x:y pixel format first (e.g., "12345:67890" or "12345x67890")
  const pixelColonMatch = trimmed.match(/^(\d+)\s*[:x]\s*(\d+)$/i);
  if (pixelColonMatch) {
    const x = parseInt(pixelColonMatch[1]);
    const y = parseInt(pixelColonMatch[2]);
    // Validate against grid size
    if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
      return { type: 'pixel', x, y };
    }
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
    
    // If both are positive integers within grid bounds, treat as pixel coordinates
    if (a >= 0 && b >= 0 && Number.isInteger(a) && Number.isInteger(b) && 
        a < GRID_SIZE && b < GRID_SIZE) {
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
