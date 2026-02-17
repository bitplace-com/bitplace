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
  return `${baseUrl}/profile/${userId}`;
}

/**
 * Share a pixel using Web Share API (mobile) or clipboard fallback (desktop)
 */
export async function sharePixel(x: number, y: number): Promise<boolean> {
  const link = generatePixelShareLink(x, y);
  const shareData = {
    title: `Pixel ${x}:${y} on Bitplace`,
    text: 'Check out this pixel on Bitplace!',
    url: link,
  };

  if (navigator.share) {
    try {
      await navigator.share(shareData);
      return true;
    } catch {
      // User cancelled or error — fall through to clipboard
    }
  }
  return copyPixelLink(x, y);
}

/**
 * Share a player's artwork / profile using Web Share API or clipboard fallback
 */
export async function shareArtwork(userId: string, displayName?: string | null): Promise<boolean> {
  const link = generateProfileShareLink(userId);
  const name = displayName || 'a player';
  const shareData = {
    title: `${name}'s paints on Bitplace`,
    text: `Check out ${name}'s pixel art on Bitplace!`,
    url: link,
  };

  if (navigator.share) {
    try {
      await navigator.share(shareData);
      return true;
    } catch {
      // User cancelled
    }
  }
  // Fallback: copy link
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
