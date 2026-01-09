// Chromatic ordered palette grid for Bitplace
// Ordered by hue: warm→cool (Reds→Oranges→Yellows→Greens→Teals→Blues→Purples→Pinks)
// Within each hue family: light→dark ordering (top to bottom per row)

export const BASE_PALETTE_GRID: string[][] = [
  // Row 1: Reds (light → dark)
  ['#ffc5a5', '#fab6a4', '#fa8072', '#f38da9', '#ed1c24', '#ec1f80', '#cb007a', '#a50e1e', '#600018'],
  
  // Row 2: Oranges (light → dark)
  ['#f8b277', '#ff7f27', '#e45c1a', '#d18051', '#dba463', '#d18078', '#9b5249', '#95682a', '#684634'],
  
  // Row 3: Yellows + Warm Greens (light → dark)
  ['#fffabc', '#e8d45f', '#f9dd3b', '#f6aa09', '#c5ad31', '#9c8431', '#87ff5e', '#84c573', '#5a944a'],
  
  // Row 4: Greens + Teals (light → dark)
  ['#13e67b', '#0eb968', '#4a6b3a', '#bbfaf2', '#60f7f2', '#13e1be', '#10aea6', '#0c816e'],
  
  // Row 5: Blues (light → dark)
  ['#7dc7ff', '#4093e4', '#0f799f', '#28509e', '#99b1fb', '#7a71c4', '#6b50f6', '#4d31b8', '#4a4284'],
  
  // Row 6: Purples + Pinks (light → dark)
  ['#e09ff9', '#b5aef1', '#aa38b9', '#780c99', '#d6b594', '#cdc59e', '#9c846b', '#948c6b', '#7b6352', '#6d643f'],
  
  // Row 7: Grayscale (light → dark)
  ['#ffffff', '#d2d2d2', '#b3b9d1', '#aaaaaa', '#787878', '#6d758d', '#3c3c3c', '#333941', '#000000'],
];

// Flat array for compatibility with existing code
export const ALL_COLORS = BASE_PALETTE_GRID.flat();
