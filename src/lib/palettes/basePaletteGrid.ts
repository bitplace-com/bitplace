// Chromatic ordered palette grid for Bitplace
// Ordered: Grayscale first, then warm→cool (Reds→Oranges→Yellows→Greens→Teals→Blues→Purples→Pinks)
// Within each hue family: light→dark ordering

export const BASE_PALETTE_GRID: string[][] = [
  // Row 1: Grayscale (light → dark)
  ['#ffffff', '#d2d2d2', '#b3b9d1', '#aaaaaa', '#787878', '#6d758d', '#3c3c3c', '#333941', '#000000'],
  
  // Row 2: Reds (light → dark) + Oranges (light → dark)
  ['#fa8072', '#ed1c24', '#a50e1e', '#600018', '#ffc5a5', '#f8b277', '#d18051', '#ff7f27', '#e45c1a'],
  
  // Row 3: Yellows (light → dark) + Greens start (light → dark)
  ['#fffabc', '#e8d45f', '#f9dd3b', '#c5ad31', '#f6aa09', '#9c8431', '#87ff5e', '#13e67b', '#84c573'],
  
  // Row 4: Greens continued + Teals (light → dark)
  ['#5a944a', '#0eb968', '#4a6b3a', '#bbfaf2', '#60f7f2', '#13e1be', '#10aea6', '#0c816e'],
  
  // Row 5: Blues (light → dark) + Purples (light → dark)
  ['#7dc7ff', '#4093e4', '#0f799f', '#28509e', '#b5aef1', '#99b1fb', '#7a71c4', '#6b50f6', '#4d31b8', '#4a4284'],
  
  // Row 6: Pinks (light → dark) + Browns (light → dark)
  ['#f38da9', '#e09ff9', '#ec1f80', '#aa38b9', '#cb007a', '#780c99', '#fab6a4', '#d18078', '#dba463', '#9b5249', '#95682a', '#684634'],
  
  // Row 7: Sand / Neutral earth tones (light → dark)
  ['#d6b594', '#cdc59e', '#9c846b', '#948c6b', '#7b6352', '#6d643f'],
];

// Flat array for compatibility with existing code
export const ALL_COLORS = BASE_PALETTE_GRID.flat();
