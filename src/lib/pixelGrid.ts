/**
 * Pixel Grid System for Bitplace
 * Uses WebMercator projection at GRID_ZOOM=12 for a true Wplace-like pixel grid
 */

// Core constants
export const TILE_SIZE = 512;
export const GRID_ZOOM = 12;
export const GRID_SIZE = TILE_SIZE * Math.pow(2, GRID_ZOOM); // 2,097,152 pixels per axis

// Data tile size for viewport-based fetching (matches map tiles)
export const DATA_TILE_SIZE = 512;

/**
 * Convert pixel coordinates to tile coordinates
 */
export function pixelToTile(x: number, y: number): { tx: number; ty: number } {
  return {
    tx: Math.floor(x / DATA_TILE_SIZE),
    ty: Math.floor(y / DATA_TILE_SIZE),
  };
}

/**
 * Generate tile cache key
 */
export function tileKey(tx: number, ty: number): string {
  return `${tx}:${ty}`;
}

// WebMercator latitude bounds
const MAX_LAT = 85.05112878;

/**
 * Clamp latitude to WebMercator bounds
 */
export function clampLat(lat: number): number {
  return Math.max(-MAX_LAT, Math.min(MAX_LAT, lat));
}

/**
 * Normalize longitude to [-180, 180)
 */
export function normalizeLng(lng: number): number {
  return ((lng + 180) % 360 + 360) % 360 - 180;
}

/**
 * Convert lng/lat to floating-point grid coordinates
 */
export function lngLatToGridFloat(lng: number, lat: number): { x: number; y: number } {
  const clampedLat = clampLat(lat);
  const normalizedLng = normalizeLng(lng);
  
  const xNorm = (normalizedLng + 180) / 360;
  const latRad = (clampedLat * Math.PI) / 180;
  const yNorm = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2;
  
  return { x: xNorm * GRID_SIZE, y: yNorm * GRID_SIZE };
}

/**
 * Convert lng/lat to integer grid coordinates (for painting/snapping)
 */
export function lngLatToGridInt(lng: number, lat: number): { x: number; y: number } {
  const { x, y } = lngLatToGridFloat(lng, lat);
  return { x: Math.floor(x), y: Math.floor(y) };
}

/**
 * Convert grid integer coordinates to lng/lat (center of pixel)
 */
export function gridIntToLngLat(x: number, y: number): { lng: number; lat: number } {
  const xNorm = (x + 0.5) / GRID_SIZE;
  const yNorm = (y + 0.5) / GRID_SIZE;
  
  const lng = xNorm * 360 - 180;
  const lat = (Math.atan(Math.sinh(Math.PI * (1 - 2 * yNorm))) * 180) / Math.PI;
  
  return { lng, lat };
}

/**
 * Compute cell size in CSS pixels at current map zoom
 * At GRID_ZOOM (12), each cell is exactly 1 tile pixel
 * At zoom 16, each cell is 16 CSS pixels (2^(16-12) = 16)
 */
export function getCellSize(mapZoom: number): number {
  return Math.pow(2, mapZoom - GRID_ZOOM);
}

/**
 * Minimum cell size in CSS pixels for interaction (painting, selecting)
 * At 8px cells are large enough to click/tap reliably
 */
export const MIN_CELL_SIZE_INTERACT = 2;

/**
 * Minimum zoom level where paints become visible/interactive
 * At z13, cell size = 2px (MIN_CELL_SIZE_INTERACT)
 */
export const Z_SHOW_PAINTS = 13;

/**
 * Check if painting/interaction is allowed at current zoom
 * Returns true when cell size is large enough for usable interaction
 */
export function canInteractAtZoom(mapZoom: number): boolean {
  return getCellSize(mapZoom) >= MIN_CELL_SIZE_INTERACT;
}

/**
 * Helper for crisp rendering: round to device pixel boundary
 */
export function roundToDevicePixel(value: number, dpr: number = window.devicePixelRatio || 1): number {
  return Math.round(value * dpr) / dpr;
}

/**
 * Get viewport bounds in grid coordinates from map bounds
 */
export function getViewportGridBounds(
  west: number, 
  east: number, 
  north: number, 
  south: number
): { minX: number; maxX: number; minY: number; maxY: number } {
  const topLeft = lngLatToGridInt(west, north);
  const bottomRight = lngLatToGridInt(east, south);
  
  return {
    minX: topLeft.x,
    maxX: bottomRight.x,
    minY: topLeft.y,
    maxY: bottomRight.y,
  };
}
