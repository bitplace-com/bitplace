/**
 * Material Registry - Special/Premium paint materials
 * 
 * Materials are stored as "mat:<id>" in the database and render
 * with gradient/pattern effects on the canvas.
 */

export interface MaterialDef {
  id: string;
  label: string;
  category: 'metals' | 'holographic' | 'elements' | 'special';
  cssGradient: string;
  colors: string[]; // For pattern generation
}

// Deterministic pseudo-random noise based on position
function seededNoise(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
  return n - Math.floor(n);
}

// All material definitions - ordered warm→cool
export const MATERIALS: MaterialDef[] = [
  // === ELEMENTS (WARM) ===
  {
    id: 'mat:fire',
    label: 'Fire',
    category: 'elements',
    cssGradient: 'linear-gradient(135deg, #8B0000 0%, #FF4500 30%, #FFD700 60%, #FF6347 100%)',
    colors: ['#8B0000', '#FF4500', '#FFD700', '#FF6347'],
  },
  {
    id: 'mat:lava',
    label: 'Lava',
    category: 'elements',
    cssGradient: 'linear-gradient(135deg, #1a0a00 0%, #FF4500 25%, #8B0000 50%, #FF6600 75%, #1a0a00 100%)',
    colors: ['#1a0a00', '#FF4500', '#8B0000', '#FF6600'],
  },

  // === METALS (WARM → COOL) ===
  {
    id: 'mat:gold',
    label: 'Gold',
    category: 'metals',
    cssGradient: 'linear-gradient(135deg, #B8860B 0%, #FFD700 30%, #FFF8DC 50%, #FFD700 70%, #B8860B 100%)',
    colors: ['#B8860B', '#FFD700', '#FFF8DC', '#DAA520'],
  },
  {
    id: 'mat:bronze',
    label: 'Bronze',
    category: 'metals',
    cssGradient: 'linear-gradient(135deg, #8B4513 0%, #CD7F32 30%, #DEB887 50%, #CD7F32 70%, #8B4513 100%)',
    colors: ['#8B4513', '#CD7F32', '#DEB887', '#A0522D'],
  },
  {
    id: 'mat:silver',
    label: 'Silver',
    category: 'metals',
    cssGradient: 'linear-gradient(135deg, #708090 0%, #C0C0C0 30%, #F8F8FF 50%, #C0C0C0 70%, #708090 100%)',
    colors: ['#708090', '#C0C0C0', '#F8F8FF', '#A9A9A9'],
  },

  // === ELEMENTS (COOL) ===
  {
    id: 'mat:ice',
    label: 'Ice',
    category: 'elements',
    cssGradient: 'linear-gradient(135deg, #87CEEB 0%, #E0FFFF 30%, #FFFFFF 50%, #B0E0E6 70%, #87CEEB 100%)',
    colors: ['#87CEEB', '#E0FFFF', '#FFFFFF', '#B0E0E6', '#ADD8E6'],
  },

  // === HOLOGRAPHIC ===
  {
    id: 'mat:holo_rainbow',
    label: 'Holographic',
    category: 'holographic',
    cssGradient: 'linear-gradient(135deg, #FF0080 0%, #FF8C00 15%, #FFD700 30%, #00FF00 45%, #00BFFF 60%, #8A2BE2 75%, #FF0080 100%)',
    colors: ['#FF0080', '#FF8C00', '#FFD700', '#00FF00', '#00BFFF', '#8A2BE2'],
  },
  {
    id: 'mat:prism',
    label: 'Prism',
    category: 'holographic',
    cssGradient: 'linear-gradient(135deg, #FFB6C1 0%, #FFEFD5 20%, #E0FFFF 40%, #E6E6FA 60%, #DDA0DD 80%, #FFB6C1 100%)',
    colors: ['#FFB6C1', '#FFEFD5', '#E0FFFF', '#E6E6FA', '#DDA0DD'],
  },

  // === SPECIAL (WARM → COOL) ===
  {
    id: 'mat:aurora',
    label: 'Aurora',
    category: 'special',
    cssGradient: 'linear-gradient(180deg, #00FF7F 0%, #9370DB 50%, #4B0082 100%)',
    colors: ['#00FF7F', '#9370DB', '#4B0082', '#20B2AA'],
  },
  {
    id: 'mat:pearl',
    label: 'Pearl',
    category: 'special',
    cssGradient: 'linear-gradient(135deg, #F5F5DC 0%, #FFFAFA 30%, #FFE4E1 50%, #F0FFF0 70%, #F5F5DC 100%)',
    colors: ['#F5F5DC', '#FFFAFA', '#FFE4E1', '#F0FFF0'],
  },
  {
    id: 'mat:nebula',
    label: 'Nebula',
    category: 'special',
    cssGradient: 'linear-gradient(135deg, #0D0221 0%, #4B0082 30%, #8B008B 60%, #0D0221 100%)',
    colors: ['#0D0221', '#4B0082', '#8B008B', '#191970'],
  },
  {
    id: 'mat:carbon',
    label: 'Carbon Fiber',
    category: 'special',
    cssGradient: 'repeating-linear-gradient(45deg, #1a1a1a 0px, #1a1a1a 2px, #2d2d2d 2px, #2d2d2d 4px)',
    colors: ['#1a1a1a', '#2d2d2d', '#3a3a3a', '#0a0a0a'],
  },
];

// Material lookup map
export const MATERIAL_MAP = new Map<string, MaterialDef>(
  MATERIALS.map(m => [m.id, m])
);

// Valid material IDs for validation
export const VALID_MATERIAL_IDS = MATERIALS.map(m => m.id);

// Check if a paint ID is a material
export function isMaterial(paintId: string): boolean {
  return paintId.startsWith('mat:');
}

// Get material definition by ID
export function getMaterial(materialId: string): MaterialDef | undefined {
  return MATERIAL_MAP.get(materialId);
}

// Pattern cache for canvas rendering
const patternCache = new Map<string, CanvasPattern | null>();

// Generate a pattern for a material (32x32 tiles)
function generatePattern(material: MaterialDef): CanvasPattern | null {
  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const colors = material.colors;

  switch (material.category) {
    case 'metals': {
      // Diagonal metallic gradient with noise
      const gradient = ctx.createLinearGradient(0, 0, size, size);
      gradient.addColorStop(0, colors[0]);
      gradient.addColorStop(0.3, colors[1]);
      gradient.addColorStop(0.5, colors[2]);
      gradient.addColorStop(0.7, colors[1]);
      gradient.addColorStop(1, colors[0]);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);

      // Add subtle noise for metallic speckle
      const imageData = ctx.getImageData(0, 0, size, size);
      const data = imageData.data;
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const i = (y * size + x) * 4;
          const noise = (seededNoise(x, y, 42) - 0.5) * 25;
          data[i] = Math.min(255, Math.max(0, data[i] + noise));
          data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
          data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
        }
      }
      ctx.putImageData(imageData, 0, 0);
      break;
    }

    case 'holographic': {
      // Multi-stop rainbow gradient with light noise
      const gradient = ctx.createLinearGradient(0, 0, size, size);
      colors.forEach((color, i) => {
        gradient.addColorStop(i / (colors.length - 1), color);
      });
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);

      // Add shimmer noise
      const imageData = ctx.getImageData(0, 0, size, size);
      const data = imageData.data;
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const i = (y * size + x) * 4;
          const noise = seededNoise(x, y, 123) * 30;
          data[i] = Math.min(255, data[i] + noise);
          data[i + 1] = Math.min(255, data[i + 1] + noise);
          data[i + 2] = Math.min(255, data[i + 2] + noise);
        }
      }
      ctx.putImageData(imageData, 0, 0);
      break;
    }

    case 'elements': {
      if (material.id === 'mat:lava') {
        // Dark base with crack pattern
        ctx.fillStyle = colors[0];
        ctx.fillRect(0, 0, size, size);
        
        // Draw glowing cracks
        ctx.strokeStyle = colors[1];
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const startX = seededNoise(i, 0, 77) * size;
          const startY = seededNoise(i, 1, 77) * size;
          ctx.moveTo(startX, startY);
          ctx.lineTo(startX + (seededNoise(i, 2, 77) - 0.5) * 20, startY + (seededNoise(i, 3, 77) - 0.5) * 20);
        }
        ctx.stroke();

        // Add ember specks
        ctx.fillStyle = colors[3];
        for (let i = 0; i < 8; i++) {
          const x = seededNoise(i, 10, 88) * size;
          const y = seededNoise(i, 11, 88) * size;
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Ice/Fire: gradient with sparkle specks
        const gradient = ctx.createLinearGradient(0, 0, size, size);
        colors.forEach((color, i) => {
          gradient.addColorStop(i / (colors.length - 1), color);
        });
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);

        // Add sparkle specks
        ctx.fillStyle = '#FFFFFF';
        for (let i = 0; i < 6; i++) {
          const x = seededNoise(i, 20, 99) * size;
          const y = seededNoise(i, 21, 99) * size;
          ctx.globalAlpha = 0.6 + seededNoise(i, 22, 99) * 0.4;
          ctx.beginPath();
          ctx.arc(x, y, 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      break;
    }

    case 'special': {
      if (material.id === 'mat:carbon') {
        // Carbon fiber weave pattern
        ctx.fillStyle = colors[0];
        ctx.fillRect(0, 0, size, size);
        
        // Draw diagonal weave
        ctx.strokeStyle = colors[1];
        ctx.lineWidth = 2;
        for (let i = -size; i < size * 2; i += 4) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i + size, size);
          ctx.stroke();
        }
        
        // Add subtle highlight
        ctx.strokeStyle = colors[2];
        ctx.lineWidth = 0.5;
        for (let i = -size; i < size * 2; i += 8) {
          ctx.beginPath();
          ctx.moveTo(i + 1, 0);
          ctx.lineTo(i + 1 + size, size);
          ctx.stroke();
        }
      } else if (material.id === 'mat:nebula') {
        // Deep space with star specks
        const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size);
        gradient.addColorStop(0, colors[2]);
        gradient.addColorStop(0.5, colors[1]);
        gradient.addColorStop(1, colors[0]);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);

        // Add stars
        ctx.fillStyle = '#FFFFFF';
        for (let i = 0; i < 10; i++) {
          const x = seededNoise(i, 30, 111) * size;
          const y = seededNoise(i, 31, 111) * size;
          ctx.globalAlpha = 0.3 + seededNoise(i, 32, 111) * 0.7;
          ctx.beginPath();
          ctx.arc(x, y, 0.5 + seededNoise(i, 33, 111) * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      } else {
        // Aurora, Pearl: soft gradient
        const isVertical = material.id === 'mat:aurora';
        const gradient = isVertical 
          ? ctx.createLinearGradient(0, 0, 0, size)
          : ctx.createLinearGradient(0, 0, size, size);
        colors.forEach((color, i) => {
          gradient.addColorStop(i / (colors.length - 1), color);
        });
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);

        // Pearl gets iridescent shimmer
        if (material.id === 'mat:pearl') {
          const imageData = ctx.getImageData(0, 0, size, size);
          const data = imageData.data;
          for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
              const i = (y * size + x) * 4;
              const wave = Math.sin((x + y) * 0.5) * 10;
              data[i] = Math.min(255, Math.max(0, data[i] + wave));
              data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + wave * 0.5));
              data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + wave * 0.8));
            }
          }
          ctx.putImageData(imageData, 0, 0);
        }
      }
      break;
    }
  }

  // Create the pattern using a separate canvas context
  const patternCanvas = document.createElement('canvas');
  const patternCtx = patternCanvas.getContext('2d');
  if (!patternCtx) return null;
  
  return patternCtx.createPattern(canvas, 'repeat');
}

// Get or create cached pattern for a material
export function getMaterialPattern(materialId: string): CanvasPattern | null {
  // Return cached if available
  if (patternCache.has(materialId)) {
    return patternCache.get(materialId) || null;
  }

  const material = MATERIAL_MAP.get(materialId);
  if (!material) {
    patternCache.set(materialId, null);
    return null;
  }

  const pattern = generatePattern(material);
  patternCache.set(materialId, pattern);
  return pattern;
}

// Clear pattern cache (useful when context is lost)
export function clearPatternCache(): void {
  patternCache.clear();
}

// Group materials by category for UI
export function getMaterialsByCategory(): Map<string, MaterialDef[]> {
  const grouped = new Map<string, MaterialDef[]>();
  
  for (const material of MATERIALS) {
    const existing = grouped.get(material.category) || [];
    existing.push(material);
    grouped.set(material.category, existing);
  }
  
  return grouped;
}
