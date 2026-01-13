/**
 * Compute a deterministic hash of pixel coordinates for state machine comparison.
 * Used to detect when selection changes after validation (auto-invalidation).
 */
export function computePixelHash(pixels: { x: number; y: number }[]): string {
  if (pixels.length === 0) return '';
  
  // Sort pixels for deterministic order
  const sorted = [...pixels].sort((a, b) => 
    a.x === b.x ? a.y - b.y : a.x - b.x
  );
  
  // Create a simple string representation
  const str = sorted.map(p => `${p.x}:${p.y}`).join(',');
  
  // Simple hash using base64 encoding (fast, sufficient for comparison)
  // For very large selections, we truncate to keep it manageable
  try {
    const encoded = btoa(str);
    return encoded.slice(0, 64); // Max 64 chars for comparison
  } catch {
    // Fallback for non-ASCII edge cases (shouldn't happen with numbers)
    return `${pixels.length}-${sorted[0]?.x ?? 0}-${sorted[sorted.length - 1]?.y ?? 0}`;
  }
}

/**
 * Check if two pixel arrays represent the same selection.
 */
export function isSameSelection(
  a: { x: number; y: number }[],
  b: { x: number; y: number }[]
): boolean {
  if (a.length !== b.length) return false;
  return computePixelHash(a) === computePixelHash(b);
}
