const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// $BIT token mint address
const BIT_TOKEN_MINT = "6az8wE4Gmns7bPLwfeR9Ed9pnGjqN5Cv9FJ3vs4Cpump";
const BIT_DECIMALS = 6;

// Solana RPC (mainnet only for SPL tokens)
const RPC_MAINNET = "https://api.mainnet-beta.solana.com";

// In-memory price cache
let priceCache: { price: number; fetchedAt: number } | null = null;
const PRICE_CACHE_TTL_MS = 30 * 1000; // 30 seconds

// PE rate: 1 PE = $0.001
const PE_PER_USD = 1000;

// Fetch $BIT SPL token balance from Solana RPC
async function fetchBitBalance(walletAddress: string): Promise<number> {
  console.log(`[token-balance] Fetching $BIT balance for ${walletAddress.substring(0, 8)}...`);

  try {
    const response = await fetch(RPC_MAINNET, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTokenAccountsByOwner",
        params: [
          walletAddress,
          { mint: BIT_TOKEN_MINT },
          { encoding: "jsonParsed" },
        ],
      }),
    });

    if (!response.ok) {
      console.error(`[token-balance] RPC returned ${response.status}`);
      return 0;
    }

    const data = await response.json();

    if (data.error) {
      console.error(`[token-balance] RPC error: ${data.error.message}`);
      return 0;
    }

    const accounts = data.result?.value || [];
    if (accounts.length === 0) {
      console.log("[token-balance] No $BIT token account found (balance = 0)");
      return 0;
    }

    // Sum balances across all token accounts for this mint
    let totalRaw = 0;
    for (const account of accounts) {
      const info = account.account?.data?.parsed?.info;
      if (info) {
        totalRaw += Number(info.tokenAmount?.amount || 0);
      }
    }

    const balance = totalRaw / Math.pow(10, BIT_DECIMALS);
    console.log(`[token-balance] $BIT balance: ${balance} (raw: ${totalRaw})`);
    return balance;
  } catch (err) {
    console.error("[token-balance] Balance fetch exception:", err);
    return 0;
  }
}

// Fetch $BIT/USD price from DexScreener (with caching)
async function fetchBitPrice(): Promise<number> {
  const now = Date.now();

  if (priceCache && (now - priceCache.fetchedAt) < PRICE_CACHE_TTL_MS) {
    console.log(`[token-balance] Using cached $BIT price: $${priceCache.price}`);
    return priceCache.price;
  }

  console.log("[token-balance] Fetching $BIT price from DexScreener...");

  try {
    const response = await fetch(
      `https://api.dexscreener.com/token-pairs/v1/solana/${BIT_TOKEN_MINT}`,
      { headers: { Accept: "application/json" } }
    );

    if (!response.ok) {
      console.error(`[token-balance] DexScreener returned ${response.status}`);
      return priceCache?.price ?? 0;
    }

    const data = await response.json();
    
    // DexScreener returns an array of pairs; use the first one
    const pairs = Array.isArray(data) ? data : data.pairs || [];
    const price = parseFloat(pairs[0]?.priceUsd ?? "0");

    if (price <= 0) {
      console.error("[token-balance] No valid price from DexScreener");
      return priceCache?.price ?? 0;
    }

    console.log(`[token-balance] $BIT price: $${price}`);
    priceCache = { price, fetchedAt: now };
    return price;
  } catch (err) {
    console.error("[token-balance] Price fetch exception:", err);
    return priceCache?.price ?? 0;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { wallet } = await req.json();

    if (!wallet || typeof wallet !== "string") {
      return new Response(
        JSON.stringify({ error: "INVALID_REQUEST", message: "Wallet address required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[token-balance] Request for wallet: ${wallet.substring(0, 8)}...`);

    // Fetch balance and price in parallel
    const [bitBalance, bitPrice] = await Promise.all([
      fetchBitBalance(wallet),
      fetchBitPrice(),
    ]);

    const walletUsd = bitBalance * bitPrice;
    const peTotal = Math.floor(walletUsd * PE_PER_USD);

    console.log(`[token-balance] Result: ${bitBalance} BIT × $${bitPrice} = $${walletUsd.toFixed(4)} = ${peTotal} PE`);

    return new Response(
      JSON.stringify({
        ok: true,
        bitBalance,
        usdPrice: bitPrice,
        walletUsd,
        peTotal,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[token-balance] Error:", error);
    return new Response(
      JSON.stringify({
        error: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
