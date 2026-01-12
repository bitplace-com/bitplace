/**
 * Progression system utilities
 * Level formula: min(100, floor(sqrt(pixels_painted_total / 10)) + 1)
 * Driven ONLY by total pixels painted (successful PAINT commits)
 */

const BASE = 10;
const MAX_LEVEL = 100;

export function calculateLevel(pixelsPainted: number): number {
  return Math.min(MAX_LEVEL, Math.floor(Math.sqrt(pixelsPainted / BASE)) + 1);
}

export function thresholdForLevel(level: number): number {
  // prev_threshold = BASE * ((level - 1)^2)
  return BASE * Math.pow(level - 1, 2);
}

export function thresholdForNextLevel(level: number): number {
  // next_threshold = BASE * (level^2)
  return BASE * Math.pow(level, 2);
}

export function levelProgress(pixelsPainted: number): number {
  const currentLevel = calculateLevel(pixelsPainted);
  if (currentLevel >= MAX_LEVEL) return 100;
  
  const prevThreshold = thresholdForLevel(currentLevel);
  const nextThreshold = thresholdForNextLevel(currentLevel);
  const progress = ((pixelsPainted - prevThreshold) / (nextThreshold - prevThreshold)) * 100;
  return Math.min(100, Math.max(0, progress));
}

// Status titles adjusted for 100 levels
export type StatusTitle = "Newcomer" | "Builder" | "Artist" | "Guardian" | "Veteran" | "Legend";

export function getStatusTitle(level: number): StatusTitle {
  if (level <= 10) return "Newcomer";
  if (level <= 25) return "Builder";
  if (level <= 50) return "Artist";
  if (level <= 75) return "Guardian";
  if (level <= 99) return "Veteran";
  return "Legend"; // Level 100
}

export function getStatusColor(level: number): string {
  if (level <= 10) return "text-muted-foreground";
  if (level <= 25) return "text-blue-500";
  if (level <= 50) return "text-purple-500";
  if (level <= 75) return "text-amber-500";
  if (level <= 99) return "text-emerald-500";
  return "text-yellow-400"; // Legend gold
}

export function getStatusBgColor(level: number): string {
  if (level <= 10) return "bg-muted";
  if (level <= 25) return "bg-blue-500/10";
  if (level <= 50) return "bg-purple-500/10";
  if (level <= 75) return "bg-amber-500/10";
  if (level <= 99) return "bg-emerald-500/10";
  return "bg-yellow-400/10";
}
