// Legacy palette file - redirects to basePaletteGrid for compatibility
// This file is kept for backward compatibility with existing imports

import { BASE_PALETTE_GRID, ALL_COLORS } from './basePaletteGrid';

export interface ColorGroup {
  name: string;
  colors: string[];
}

// Create ColorGroup format from grid for legacy compatibility
export const BASE_PALETTE: ColorGroup[] = [
  { name: 'Grayscale', colors: BASE_PALETTE_GRID[0] },
  { name: 'Reds & Oranges', colors: BASE_PALETTE_GRID[1] },
  { name: 'Yellows & Greens', colors: BASE_PALETTE_GRID[2] },
  { name: 'Greens & Teals', colors: BASE_PALETTE_GRID[3] },
  { name: 'Blues & Purples', colors: BASE_PALETTE_GRID[4] },
  { name: 'Pinks & Browns', colors: BASE_PALETTE_GRID[5] },
  { name: 'Sand', colors: BASE_PALETTE_GRID[6] },
];

export { ALL_COLORS };
