import { pixelToLngLat } from './coordinates';

/**
 * Generate a deep link URL for a specific pixel
 */
export function generatePixelShareLink(
  x: number,
  y: number,
  _zoom: number = 18,
  userId?: string
): string {
  const baseUrl = window.location.origin;
  let url = `${baseUrl}/p/${x}:${y}`;
  if (userId) url += `?player=${userId}`;
  return url;
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
export async function sharePixel(x: number, y: number, userId?: string): Promise<boolean> {
  return copyPixelLink(x, y, userId);
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
export async function copyPixelLink(x: number, y: number, userId?: string): Promise<boolean> {
  const link = generatePixelShareLink(x, y, 18, userId);
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
