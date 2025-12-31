/**
 * Progression system utilities
 * Level formula: level = 1 + floor(sqrt(xp / 50))
 */

export function calculateLevel(xp: number): number {
  return 1 + Math.floor(Math.sqrt(xp / 50));
}

export function xpForLevel(level: number): number {
  return Math.pow(level - 1, 2) * 50;
}

export function xpForNextLevel(level: number): number {
  return Math.pow(level, 2) * 50;
}

export function levelProgress(xp: number): number {
  const currentLevel = calculateLevel(xp);
  const currentLevelXp = xpForLevel(currentLevel);
  const nextLevelXp = xpForNextLevel(currentLevel);
  const progress = ((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;
  return Math.min(100, Math.max(0, progress));
}

export type StatusTitle = "Newcomer" | "Builder" | "Artist" | "Guardian" | "Veteran";

export function getStatusTitle(level: number): StatusTitle {
  if (level <= 3) return "Newcomer";
  if (level <= 7) return "Builder";
  if (level <= 12) return "Artist";
  if (level <= 18) return "Guardian";
  return "Veteran";
}

export function getStatusColor(level: number): string {
  if (level <= 3) return "text-muted-foreground";
  if (level <= 7) return "text-blue-500";
  if (level <= 12) return "text-purple-500";
  if (level <= 18) return "text-amber-500";
  return "text-emerald-500";
}

export function getStatusBgColor(level: number): string {
  if (level <= 3) return "bg-muted";
  if (level <= 7) return "bg-blue-500/10";
  if (level <= 12) return "bg-purple-500/10";
  if (level <= 18) return "bg-amber-500/10";
  return "bg-emerald-500/10";
}
