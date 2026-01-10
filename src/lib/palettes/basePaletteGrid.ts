// Re-export from the new ordered palette file
// This file is kept for backward compatibility
import { BASE_COLORS_ORDERED } from './basePaletteOrdered';

// The main ordered flat array - use this for rendering
export const ALL_COLORS = BASE_COLORS_ORDERED;

// Legacy grid format (kept for any code that still expects 2D array)
// Rows of ~9 colors each to match the grid display
export const BASE_PALETTE_GRID: string[][] = [
  BASE_COLORS_ORDERED.slice(0, 9),
  BASE_COLORS_ORDERED.slice(9, 18),
  BASE_COLORS_ORDERED.slice(18, 27),
  BASE_COLORS_ORDERED.slice(27, 36),
  BASE_COLORS_ORDERED.slice(36, 45),
  BASE_COLORS_ORDERED.slice(45, 54),
  BASE_COLORS_ORDERED.slice(54),
];
