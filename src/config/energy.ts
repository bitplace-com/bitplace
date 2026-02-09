// Shared energy configuration
// Change this to 'BTP' when BTP token launches
export const ENERGY_ASSET: 'SOL' | 'BTP' = 'SOL';

export const ENERGY_CONFIG = {
  SOL: {
    symbol: 'SOL',
    decimals: 9, // lamports to SOL
    priceEndpoint: 'https://api.coinbase.com/v2/prices/SOL-USD/spot',
  },
  BTP: {
    symbol: 'BTP',
    decimals: 9,
    priceEndpoint: '', // TBD when BTP launches
  },
} as const;

// PE rate: 1 PE = $0.01, so 1 USD = 100 PE
export const PE_PER_USD = 100;

// Stale threshold for auto-refresh before actions (60 seconds)
export const ENERGY_STALE_THRESHOLD_MS = 60 * 1000;

// Rate limit for manual refresh (10 seconds)
export const ENERGY_REFRESH_COOLDOWN_MS = 10 * 1000;
