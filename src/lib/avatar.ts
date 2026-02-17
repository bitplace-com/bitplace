/**
 * Avatar generation utilities — grayscale gradients with geometric patterns
 */

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}

const ANGLES = [90, 135, 180, 225, 270, 315] as const;

export function generateAvatarGradient(seed: string): string {
  const hash = hashSeed(seed);
  // Lightness range 10-45% — dark enough for white text
  const l1 = 10 + (hash % 15);          // 10–24
  const l2 = 30 + ((hash >> 8) % 16);   // 30–45
  const angle = ANGLES[hash % ANGLES.length];
  return `linear-gradient(${angle}deg, hsl(0, 0%, ${l1}%), hsl(0, 0%, ${l2}%))`;
}

export type AvatarPattern = 'circle' | 'diamond' | 'cross' | 'dots' | 'diagonal-lines' | 'corner-squares';

const PATTERNS: AvatarPattern[] = ['circle', 'diamond', 'cross', 'dots', 'diagonal-lines', 'corner-squares'];

export function generateAvatarPattern(seed: string): { pattern: AvatarPattern; opacity: number } {
  const hash = hashSeed(seed);
  const pattern = PATTERNS[(hash >> 4) % PATTERNS.length];
  const opacity = 0.08 + ((hash >> 12) % 8) * 0.01; // 0.08–0.15
  return { pattern, opacity };
}

export function getAvatarInitial(name: string | null | undefined, wallet: string | null): string {
  if (name && name.length > 0) return name.charAt(0).toUpperCase();
  if (wallet && wallet.length > 0) return wallet.charAt(0).toUpperCase();
  return "?";
}
