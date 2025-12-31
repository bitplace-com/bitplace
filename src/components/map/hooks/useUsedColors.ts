import { useMemo } from 'react';
import { COLOR_PALETTE } from './useMapState';

export function useUsedColors(
  viewportPixels: Map<string, { color: string }>
): string[] {
  return useMemo(() => {
    const colors = new Set<string>();
    viewportPixels.forEach((pixel) => {
      if (pixel.color) {
        colors.add(pixel.color.toUpperCase());
      }
    });
    
    // Return in palette order (if in palette) then others
    const paletteUpper = COLOR_PALETTE.map(c => c.toUpperCase());
    return [...colors].sort((a, b) => {
      const aIdx = paletteUpper.indexOf(a);
      const bIdx = paletteUpper.indexOf(b);
      if (aIdx === -1 && bIdx === -1) return 0;
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    });
  }, [viewportPixels]);
}
