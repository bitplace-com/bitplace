/**
 * Palette Quantizer for Templates Pixel Guide
 * Maps arbitrary RGB colors to the nearest Bitplace palette color
 */

import { ALL_COLORS } from '@/lib/palettes/basePaletteGrid';

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
 * Get available palette colors as RGB map (cached)
 */
function getPaletteRGB(): Map<string, RGB> {
  if (!paletteRGBCache) {
    paletteRGBCache = new Map();
    ALL_COLORS.forEach(hex => {
      paletteRGBCache!.set(hex.toUpperCase(), hexToRGB(hex));
    });
  }
  return paletteRGBCache;
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
export function nearestPaletteColor(rgb: RGB): string {
  const palette = getPaletteRGB();
  
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

/** Max pixels for guide resolution cap */
const MAX_GUIDE_PIXELS = 250_000;

/**
 * Prepare canvas image data for quantization, with resolution cap
 */
function prepareImageData(
  image: HTMLImageElement,
  scale: number,
  alphaThreshold: number
): { data: Uint8ClampedArray; guideW: number; guideH: number } | null {
  let guideW = Math.max(1, Math.round(image.width * scale / 100));
  let guideH = Math.max(1, Math.round(image.height * scale / 100));

  // Cap resolution to prevent excessive computation
  const totalPixels = guideW * guideH;
  if (totalPixels > MAX_GUIDE_PIXELS) {
    const ratio = Math.sqrt(MAX_GUIDE_PIXELS / totalPixels);
    guideW = Math.max(1, Math.round(guideW * ratio));
    guideH = Math.max(1, Math.round(guideH * ratio));
  }

  const canvas = document.createElement('canvas');
  canvas.width = guideW;
  canvas.height = guideH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, 0, 0, guideW, guideH);

  const imageData = ctx.getImageData(0, 0, guideW, guideH);
  return { data: imageData.data, guideW, guideH };
}

/**
 * Quantize an image to palette colors (synchronous - for small images)
 */
export function quantizeImage(
  image: HTMLImageElement,
  scale: number,
  options?: QuantizeOptions
): QuantizedPixel[] {
  const alphaThreshold = options?.alphaThreshold ?? 25;
  const prepared = prepareImageData(image, scale, alphaThreshold);
  if (!prepared) return [];

  const { data, guideW, guideH } = prepared;
  const pixels: QuantizedPixel[] = [];
  const palette = getPaletteRGB();

  for (let dy = 0; dy < guideH; dy++) {
    for (let dx = 0; dx < guideW; dx++) {
      const i = (dy * guideW + dx) * 4;
      const a = data[i + 3];
      if (a < alphaThreshold) continue;

      const rgb: RGB = { r: data[i], g: data[i + 1], b: data[i + 2] };
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
 * Quantize an image to palette colors (async batched - prevents UI freeze)
 */
export async function quantizeImageAsync(
  image: HTMLImageElement,
  scale: number,
  options?: QuantizeOptions,
  onProgress?: (percent: number) => void
): Promise<QuantizedPixel[]> {
  const alphaThreshold = options?.alphaThreshold ?? 25;
  const prepared = prepareImageData(image, scale, alphaThreshold);
  if (!prepared) return [];

  const { data, guideW, guideH } = prepared;
  const palette = getPaletteRGB();
  const paletteEntries = Array.from(palette.entries()); // avoid Map iteration overhead per pixel

  const totalPixels = guideW * guideH;
  const BATCH_SIZE = 50_000;
  const pixels: QuantizedPixel[] = [];

  for (let offset = 0; offset < totalPixels; offset += BATCH_SIZE) {
    const end = Math.min(offset + BATCH_SIZE, totalPixels);

    for (let idx = offset; idx < end; idx++) {
      const i = idx * 4;
      const a = data[i + 3];
      if (a < alphaThreshold) continue;

      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      let nearestHex = '#000000';
      let minDist = Infinity;

      for (let p = 0; p < paletteEntries.length; p++) {
        const [hex, pRgb] = paletteEntries[p];
        const dr = r - pRgb.r;
        const dg = g - pRgb.g;
        const db = b - pRgb.b;
        const dist = dr * dr + dg * dg + db * db;
        if (dist < minDist) {
          minDist = dist;
          nearestHex = hex;
        }
      }

      const dx = idx % guideW;
      const dy = Math.floor(idx / guideW);
      pixels.push({ dx, dy, hexColor: nearestHex });
    }

    // Yield to main thread between batches
    if (end < totalPixels) {
      await new Promise(r => setTimeout(r, 0));
      onProgress?.(Math.round(end / totalPixels * 100));
    }
  }

  onProgress?.(100);
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
