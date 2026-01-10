// Hue-clustered ordered palette for Bitplace
// Ordered to form visual clusters when rendered in a 9-12 column grid
// Each cluster: light → dark shades (left to right)
// Warm → Cool progression (top to bottom when wrapped)

export const BASE_COLORS_ORDERED: string[] = [
  // === REDS cluster (light → dark) ===
  '#ffc5a5', '#fab6a4', '#fa8072', '#ed1c24', '#a50e1e', '#600018',
  
  // === PINKS/MAGENTAS cluster (light → dark) ===
  '#f38da9', '#e09ff9', '#ec1f80', '#cb007a', '#aa38b9', '#780c99',
  
  // === ORANGES cluster (light → dark) ===
  '#f8b277', '#ff7f27', '#e45c1a', '#d18051', '#dba463',
  
  // === BROWNS/SANDS cluster (light → dark) ===
  '#d6b594', '#cdc59e', '#d18078', '#9c846b', '#9b5249', '#95682a', '#948c6b', '#7b6352', '#684634', '#6d643f',
  
  // === YELLOWS cluster (light → dark) ===
  '#fffabc', '#e8d45f', '#f9dd3b', '#f6aa09', '#c5ad31', '#9c8431',
  
  // === GREENS cluster (light → dark) ===
  '#87ff5e', '#84c573', '#13e67b', '#0eb968', '#5a944a', '#4a6b3a',
  
  // === TEALS/CYANS cluster (light → dark) ===
  '#bbfaf2', '#60f7f2', '#13e1be', '#10aea6', '#0c816e',
  
  // === BLUES cluster (light → dark) ===
  '#7dc7ff', '#99b1fb', '#4093e4', '#0f799f', '#28509e',
  
  // === PURPLES cluster (light → dark) ===
  '#b5aef1', '#7a71c4', '#6b50f6', '#4d31b8', '#4a4284',
  
  // === GRAYSCALE cluster (light → dark) ===
  '#ffffff', '#d2d2d2', '#b3b9d1', '#aaaaaa', '#787878', '#6d758d', '#3c3c3c', '#333941', '#000000',
];

// Total: 63 colors (7 rows × 9 cols or ~5 rows × 12 cols)
