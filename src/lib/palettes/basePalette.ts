// Hue-sorted base palette registry for Bitplace

export interface ColorGroup {
  name: string;
  colors: string[];
}

// Colors organized by hue families, ordered by lightness (dark → light) within each group
export const BASE_PALETTE: ColorGroup[] = [
  { 
    name: 'Grayscale', 
    colors: ['#000000', '#333941', '#3c3c3c', '#6d758d', '#787878', '#aaaaaa', '#b3b9d1', '#d2d2d2', '#ffffff'] 
  },
  { 
    name: 'Reds', 
    colors: ['#600018', '#a50e1e', '#ed1c24', '#fa8072'] 
  },
  { 
    name: 'Oranges', 
    colors: ['#e45c1a', '#ff7f27', '#d18051', '#f8b277', '#ffc5a5'] 
  },
  { 
    name: 'Yellows', 
    colors: ['#9c8431', '#f6aa09', '#c5ad31', '#f9dd3b', '#e8d45f', '#fffabc'] 
  },
  { 
    name: 'Greens', 
    colors: ['#4a6b3a', '#5a944a', '#0eb968', '#84c573', '#13e67b', '#87ff5e'] 
  },
  { 
    name: 'Teals', 
    colors: ['#0c816e', '#10aea6', '#13e1be', '#60f7f2', '#bbfaf2'] 
  },
  { 
    name: 'Blues', 
    colors: ['#0f799f', '#28509e', '#4093e4', '#7dc7ff'] 
  },
  { 
    name: 'Purples', 
    colors: ['#4d31b8', '#4a4284', '#6b50f6', '#7a71c4', '#99b1fb', '#b5aef1'] 
  },
  { 
    name: 'Pinks', 
    colors: ['#780c99', '#cb007a', '#aa38b9', '#ec1f80', '#e09ff9', '#f38da9'] 
  },
  { 
    name: 'Browns', 
    colors: ['#684634', '#9b5249', '#95682a', '#d18078', '#dba463', '#fab6a4'] 
  },
  { 
    name: 'Sand', 
    colors: ['#6d643f', '#7b6352', '#948c6b', '#9c846b', '#cdc59e', '#d6b594'] 
  },
];

// Flat array for compatibility with existing code
export const ALL_COLORS = BASE_PALETTE.flatMap(g => g.colors);
