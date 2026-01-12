// Color name lookup for common hex colors
const COLOR_NAMES: Record<string, string> = {
  // Grayscale
  '#ffffff': 'White',
  '#fafafa': 'Snow',
  '#f5f5f5': 'White Smoke',
  '#e8e8e8': 'Gainsboro',
  '#d3d3d3': 'Light Gray',
  '#c0c0c0': 'Silver',
  '#a9a9a9': 'Dark Gray',
  '#808080': 'Gray',
  '#696969': 'Dim Gray',
  '#4a4a4a': 'Charcoal',
  '#2d2d2d': 'Jet',
  '#1a1a1a': 'Onyx',
  '#111111': 'Rich Black',
  '#000000': 'Black',
  
  // Reds
  '#ff0000': 'Red',
  '#ff4444': 'Coral Red',
  '#ff6b6b': 'Light Red',
  '#dc143c': 'Crimson',
  '#b22222': 'Firebrick',
  '#8b0000': 'Dark Red',
  '#ff6347': 'Tomato',
  '#fa8072': 'Salmon',
  '#e9967a': 'Dark Salmon',
  '#f08080': 'Light Coral',
  
  // Oranges
  '#ff8c00': 'Dark Orange',
  '#ffa500': 'Orange',
  '#ff7f50': 'Coral',
  '#ff4500': 'Orange Red',
  '#ffb347': 'Pastel Orange',
  
  // Yellows
  '#ffff00': 'Yellow',
  '#ffd700': 'Gold',
  '#ffec8b': 'Light Gold',
  '#f0e68c': 'Khaki',
  '#fafad2': 'Light Yellow',
  '#fffacd': 'Lemon Chiffon',
  '#fff44f': 'Lemon',
  
  // Greens
  '#00ff00': 'Lime',
  '#32cd32': 'Lime Green',
  '#00fa9a': 'Medium Spring',
  '#00ff7f': 'Spring Green',
  '#7cfc00': 'Lawn Green',
  '#7fff00': 'Chartreuse',
  '#adff2f': 'Green Yellow',
  '#90ee90': 'Light Green',
  '#98fb98': 'Pale Green',
  '#8fbc8f': 'Dark Sea Green',
  '#3cb371': 'Medium Sea Green',
  '#2e8b57': 'Sea Green',
  '#228b22': 'Forest Green',
  '#008000': 'Green',
  '#006400': 'Dark Green',
  '#556b2f': 'Olive Drab',
  '#6b8e23': 'Olive',
  '#808000': 'Olive',
  
  // Cyans / Teals
  '#00ffff': 'Cyan',
  '#00ced1': 'Dark Turquoise',
  '#40e0d0': 'Turquoise',
  '#48d1cc': 'Medium Turquoise',
  '#20b2aa': 'Light Sea Green',
  '#008b8b': 'Dark Cyan',
  '#008080': 'Teal',
  '#5f9ea0': 'Cadet Blue',
  '#66cdaa': 'Medium Aquamarine',
  '#7fffd4': 'Aquamarine',
  '#e0ffff': 'Light Cyan',
  '#afeeee': 'Pale Turquoise',
  
  // Blues
  '#0000ff': 'Blue',
  '#0000cd': 'Medium Blue',
  '#00008b': 'Dark Blue',
  '#000080': 'Navy',
  '#191970': 'Midnight Blue',
  '#1e90ff': 'Dodger Blue',
  '#4169e1': 'Royal Blue',
  '#6495ed': 'Cornflower Blue',
  '#4682b4': 'Steel Blue',
  '#87ceeb': 'Sky Blue',
  '#87cefa': 'Light Sky Blue',
  '#add8e6': 'Light Blue',
  '#b0c4de': 'Light Steel Blue',
  '#00bfff': 'Deep Sky Blue',
  
  // Purples / Violets
  '#800080': 'Purple',
  '#8b008b': 'Dark Magenta',
  '#9932cc': 'Dark Orchid',
  '#9400d3': 'Dark Violet',
  '#8a2be2': 'Blue Violet',
  '#9370db': 'Medium Purple',
  '#ba55d3': 'Medium Orchid',
  '#da70d6': 'Orchid',
  '#ee82ee': 'Violet',
  '#dda0dd': 'Plum',
  '#d8bfd8': 'Thistle',
  '#e6e6fa': 'Lavender',
  '#7b68ee': 'Medium Slate Blue',
  '#6a5acd': 'Slate Blue',
  '#483d8b': 'Dark Slate Blue',
  '#663399': 'Rebecca Purple',
  '#4b0082': 'Indigo',
  
  // Pinks / Magentas
  '#ff00ff': 'Magenta',
  '#ff1493': 'Deep Pink',
  '#ff69b4': 'Hot Pink',
  '#ffb6c1': 'Light Pink',
  '#ffc0cb': 'Pink',
  '#db7093': 'Pale Violet Red',
  '#c71585': 'Medium Violet Red',
  '#ffe4e1': 'Misty Rose',
  
  // Browns
  '#a52a2a': 'Brown',
  '#8b4513': 'Saddle Brown',
  '#a0522d': 'Sienna',
  '#cd853f': 'Peru',
  '#d2691e': 'Chocolate',
  '#bc8f8f': 'Rosy Brown',
  '#f4a460': 'Sandy Brown',
  '#deb887': 'Burlywood',
  '#d2b48c': 'Tan',
  '#ffdead': 'Navajo White',
  '#ffe4c4': 'Bisque',
  '#ffe4b5': 'Moccasin',
  '#fff8dc': 'Cornsilk',
  '#fdf5e6': 'Old Lace',
  '#faebd7': 'Antique White',
  
  // Creams / Beiges
  '#f5f5dc': 'Beige',
  '#ffffe0': 'Light Yellow',
  '#fffff0': 'Ivory',
  '#faf0e6': 'Linen',
  '#fff5ee': 'Seashell',
  '#f0fff0': 'Honeydew',
  '#f5fffa': 'Mint Cream',
  '#f0ffff': 'Azure',
  '#f0f8ff': 'Alice Blue',
  '#f8f8ff': 'Ghost White',
  '#fffafa': 'Snow',
  '#fff0f5': 'Lavender Blush',
};

/**
 * Get a human-readable name for a hex color
 * Falls back to "Custom" if not found in lookup table
 */
export function getColorName(hex: string | null | undefined): string {
  if (!hex) return 'Unknown';
  
  const normalized = hex.toLowerCase().trim();
  
  // Direct lookup
  if (COLOR_NAMES[normalized]) {
    return COLOR_NAMES[normalized];
  }
  
  // Try with/without hash
  const withHash = normalized.startsWith('#') ? normalized : `#${normalized}`;
  const withoutHash = normalized.replace('#', '');
  
  if (COLOR_NAMES[withHash]) {
    return COLOR_NAMES[withHash];
  }
  
  if (COLOR_NAMES[`#${withoutHash}`]) {
    return COLOR_NAMES[`#${withoutHash}`];
  }
  
  return 'Custom';
}

/**
 * Get a simplified color category (Red, Blue, Green, etc.)
 */
export function getColorCategory(hex: string | null | undefined): string {
  if (!hex) return 'Unknown';
  
  // Parse RGB values
  const match = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!match) return 'Unknown';
  
  const r = parseInt(match[1], 16);
  const g = parseInt(match[2], 16);
  const b = parseInt(match[3], 16);
  
  // Check for grayscale first
  const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
  if (maxDiff < 20) {
    if (r < 50) return 'Black';
    if (r > 200) return 'White';
    return 'Gray';
  }
  
  // Find dominant channel(s)
  const max = Math.max(r, g, b);
  
  if (r === max && g === max) return 'Yellow';
  if (r === max && b === max) return 'Magenta';
  if (g === max && b === max) return 'Cyan';
  
  if (r === max) {
    if (g > b && g > 100) return 'Orange';
    if (b > g && b > 100) return 'Pink';
    return 'Red';
  }
  
  if (g === max) {
    if (b > r && b > 100) return 'Teal';
    return 'Green';
  }
  
  if (b === max) {
    if (r > g && r > 100) return 'Purple';
    return 'Blue';
  }
  
  return 'Custom';
}
