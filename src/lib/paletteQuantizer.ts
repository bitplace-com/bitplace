/**
 * Palette Quantizer for Templates Pixel Guide
 * Maps arbitrary RGB colors to the nearest Bitplace palette color
 */

import { ALL_COLORS } from '@/lib/palettes/basePaletteGrid';
import { MATERIALS } from '@/lib/materials/materialRegistry';

interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface QuantizedPixel {
  dx: number;      // Offset from anchor (0 to guideW-1)
  dy: number;      // Offset from anchor (0 to guideH-1)
  hexColor: string;
}

export interface QuantizeOptions {
  excludeSpecial?: boolean;   // Skip materials/special colors
  alphaThreshold?: number;    // Alpha below this = transparent (0-255, default 25)
}

// Cache for parsed palette colors
let paletteRGBCache: Map<string, RGB> | null = null;

/**
 * Parse hex color to RGB
 */
function hexToRGB(hex: string): RGB {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

/**
 * Get available palette colors as RGB map
 */
function getPaletteRGB(excludeSpecial: boolean): Map<string, RGB> {
  // Build cache if needed
  if (!paletteRGBCache) {
    paletteRGBCache = new Map();
    ALL_COLORS.forEach(hex => {
      paletteRGBCache!.set(hex.toUpperCase(), hexToRGB(hex));
    });
  }

  // If not excluding special, just return the cache
  if (!excludeSpecial) {
    return paletteRGBCache;
  }

  // Filter out special/material colors
  const filtered = new Map<string, RGB>();
  paletteRGBCache.forEach((rgb, hex) => {
    // Material IDs start with MAT_ prefix, regular colors don't
    if (!hex.startsWith('MAT_')) {
      filtered.set(hex, rgb);
    }
  });
  return filtered;
}

/**
 * Euclidean RGB distance (squared, for performance)
 */
function colorDistanceSq(c1: RGB, c2: RGB): number {
  const dr = c1.r - c2.r;
  const dg = c1.g - c2.g;
  const db = c1.b - c2.b;
  return dr * dr + dg * dg + db * db;
}

/**
 * Find nearest palette color for a given RGB value
 */
export function nearestPaletteColor(
  rgb: RGB,
  options?: QuantizeOptions
): string {
  const palette = getPaletteRGB(options?.excludeSpecial ?? false);
  
  let nearestHex = '#000000';
  let minDist = Infinity;

  palette.forEach((paletteRgb, hex) => {
    const dist = colorDistanceSq(rgb, paletteRgb);
    if (dist < minDist) {
      minDist = dist;
      nearestHex = hex;
    }
  });

  return nearestHex;
}

/**
 * Quantize an image to palette colors
 * Returns array of non-transparent pixels with their grid offsets
 */
export function quantizeImage(
  image: HTMLImageElement,
  scale: number,     // 1-400 (percentage)
  options?: QuantizeOptions
): QuantizedPixel[] {
  const alphaThreshold = options?.alphaThreshold ?? 25;
  
  // Calculate guide dimensions
  const guideW = Math.max(1, Math.round(image.width * scale / 100));
  const guideH = Math.max(1, Math.round(image.height * scale / 100));

  // Create offscreen canvas to read pixels
  const canvas = document.createElement('canvas');
  canvas.width = guideW;
  canvas.height = guideH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];

  // Draw scaled image
  ctx.imageSmoothingEnabled = false; // Crisp pixels
  ctx.drawImage(image, 0, 0, guideW, guideH);

  // Read pixel data
  const imageData = ctx.getImageData(0, 0, guideW, guideH);
  const data = imageData.data;

  const pixels: QuantizedPixel[] = [];
  const palette = getPaletteRGB(options?.excludeSpecial ?? false);

  for (let dy = 0; dy < guideH; dy++) {
    for (let dx = 0; dx < guideW; dx++) {
      const i = (dy * guideW + dx) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      // Skip transparent pixels
      if (a < alphaThreshold) continue;

      // Find nearest palette color
      const rgb: RGB = { r, g, b };
      let nearestHex = '#000000';
      let minDist = Infinity;

      palette.forEach((paletteRgb, hex) => {
        const dist = colorDistanceSq(rgb, paletteRgb);
        if (dist < minDist) {
          minDist = dist;
          nearestHex = hex;
        }
      });

      pixels.push({ dx, dy, hexColor: nearestHex });
    }
  }

  return pixels;
}

/**
 * Extract unique colors from quantized pixels
 */
export function getGuideColors(pixels: QuantizedPixel[]): string[] {
  const colors = new Set<string>();
  pixels.forEach(p => colors.add(p.hexColor));
  return Array.from(colors);
}

/**
 * Get guide dimensions from scale
 */
export function getGuideDimensions(
  imageWidth: number,
  imageHeight: number,
  scale: number
): { width: number; height: number } {
  return {
    width: Math.max(1, Math.round(imageWidth * scale / 100)),
    height: Math.max(1, Math.round(imageHeight * scale / 100)),
  };
}
