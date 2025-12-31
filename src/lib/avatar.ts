/**
 * Avatar generation utilities
 */

export function generateAvatarGradient(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash = hash & hash;
  }
  
  const hue1 = Math.abs(hash % 360);
  const hue2 = (hue1 + 45) % 360;
  
  return `linear-gradient(135deg, hsl(${hue1}, 65%, 55%), hsl(${hue2}, 70%, 45%))`;
}

export function getAvatarInitial(name: string | null | undefined, wallet: string | null): string {
  if (name && name.length > 0) return name.charAt(0).toUpperCase();
  if (wallet && wallet.length > 0) return wallet.charAt(0).toUpperCase();
  return "?";
}
