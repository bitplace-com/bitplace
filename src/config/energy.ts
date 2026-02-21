// Shared energy configuration
// Current energy asset: $BIT token on Solana
export const ENERGY_ASSET: 'BIT' = 'BIT';

// $BIT token mint address on Solana mainnet (Pump.fun launch)
export const BIT_TOKEN_MINT = '6az8wE4Gmns7bPLwfeR9Ed9pnGjqN5Cv9FJ3vs4Cpump';

export const ENERGY_CONFIG = {
  BIT: {
    symbol: 'BIT',
    decimals: 6, // standard Pump.fun token decimals
    mint: BIT_TOKEN_MINT,
    priceEndpoint: `https://api.dexscreener.com/token-pairs/v1/solana/${BIT_TOKEN_MINT}`,
  },
} as const;

// PE rate: 1 PE = $0.001, so 1 USD = 1000 PE
export const PE_PER_USD = 1000;

// Stale threshold for auto-refresh before actions (60 seconds)
export const ENERGY_STALE_THRESHOLD_MS = 60 * 1000;

// Rate limit for manual refresh (10 seconds)
export const ENERGY_REFRESH_COOLDOWN_MS = 10 * 1000;
