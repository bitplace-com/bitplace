/**
 * Format a countdown from now to a target date, showing days/hours/minutes/seconds.
 * Updates every second when used with useLiveTick().
 */
export function formatLiveCountdown(targetDate: Date, nowMs?: number): string {
  const diff = targetDate.getTime() - (nowMs ?? Date.now());
  if (diff <= 0) return 'expired';

  const seconds = Math.floor(diff / 1000) % 60;
  const minutes = Math.floor(diff / 60000) % 60;
  const hours = Math.floor(diff / 3600000) % 24;
  const days = Math.floor(diff / 86400000);

  if (days > 0) return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}
