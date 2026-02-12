export const ADMIN_WALLET = '4J2kvqRR3cb9tHdyhdyTgsnuidpmtKUKDk3AJaMhZa7C';
export const ADMIN_WALLET_SHORT = '4J2k...Za7C';

export type ProTier = 'bronze' | 'silver' | 'gold';

/**
 * Determine the Pro tier based on total staked PE.
 * 1 PE = $0.001, so thresholds in PE:
 *   gold   = $1000 → 1,000,000 PE
 *   silver = $500  →   500,000 PE
 *   bronze = $100  →   100,000 PE
 */
export function getProTier(totalStakedPe: number): ProTier | null {
  if (totalStakedPe >= 1_000_000) return 'gold';
  if (totalStakedPe >= 500_000) return 'silver';
  if (totalStakedPe >= 100_000) return 'bronze';
  return null;
}

/**
 * Check if a wallet address or wallet_short belongs to the admin.
 */
export function isAdmin(walletAddress: string | null | undefined): boolean {
  if (!walletAddress) return false;
  return walletAddress === ADMIN_WALLET || walletAddress === ADMIN_WALLET_SHORT;
}
