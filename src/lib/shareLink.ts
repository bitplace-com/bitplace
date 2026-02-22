import { pixelToLngLat } from './coordinates';

/**
 * Generate a deep link URL for a specific pixel
 */
export function generatePixelShareLink(
  x: number,
  y: number,
  zoom: number = 18
): string {
  const { lat, lng } = pixelToLngLat(x, y);
  const baseUrl = window.location.origin;
  return `${baseUrl}/?lat=${lat.toFixed(5)}&lng=${lng.toFixed(5)}&z=${zoom}&px=${x}&py=${y}`;
}

/**
 * Generate a profile share link
 */
export function generateProfileShareLink(userId: string): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}/?player=${userId}`;
}

/**
 * Share a pixel using Web Share API (mobile) or clipboard fallback (desktop)
 */
export async function sharePixel(x: number, y: number): Promise<boolean> {
  return copyPixelLink(x, y);
}

/**
 * Share a player's profile link by copying to clipboard
 */
export async function shareArtwork(userId: string, _displayName?: string | null): Promise<boolean> {
  const link = generateProfileShareLink(userId);
  try {
    await navigator.clipboard.writeText(link);
    return true;
  } catch {
    return false;
  }
}

/**
 * Copy pixel share link to clipboard
 */
export async function copyPixelLink(x: number, y: number): Promise<boolean> {
  const link = generatePixelShareLink(x, y);
  try {
    await navigator.clipboard.writeText(link);
    return true;
  } catch {
    return false;
  }
}

/**
 * Copy pixel coordinates to clipboard
 */
export async function copyPixelCoords(x: number, y: number): Promise<boolean> {
  const coords = `${x}:${y}`;
  try {
    await navigator.clipboard.writeText(coords);
    return true;
  } catch {
    return false;
  }
}
