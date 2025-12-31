import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// RPC endpoints
const RPC_MAINNET = "https://api.mainnet-beta.solana.com";
const RPC_DEVNET = "https://api.devnet.solana.com";

// In-memory price cache
let priceCache: { price: number; fetchedAt: number } | null = null;
const PRICE_CACHE_TTL_MS = 30 * 1000; // 30 seconds

// PE rate: 1 PE = $0.001
const PE_PER_USD = 1000;

// Fetch SOL balance from a specific RPC
async function fetchSolBalanceFromRpc(walletAddress: string, rpcUrl: string, cluster: string): Promise<{ balance: number; cluster: string }> {
  console.log(`[sol-balance] Fetching balance from ${cluster}: ${walletAddress.substring(0, 8)}...`);
  
  try {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getBalance",
        params: [walletAddress],
      }),
    });

    if (!response.ok) {
      console.error(`[sol-balance] BALANCE_RPC_FAILED: ${cluster} returned ${response.status}`);
      return { balance: 0, cluster };
    }

    const data = await response.json();
    
    if (data.error) {
      console.error(`[sol-balance] BALANCE_RPC_FAILED: ${cluster} error: ${data.error.message}`);
      return { balance: 0, cluster };
    }

    const lamports = data.result?.value ?? 0;
    const solBalance = lamports / 1e9;
    
    console.log(`[sol-balance] ${cluster}: ${solBalance} SOL (${lamports} lamports)`);
    return { balance: solBalance, cluster };
  } catch (err) {
    console.error(`[sol-balance] BALANCE_RPC_FAILED: ${cluster} exception:`, err);
    return { balance: 0, cluster };
  }
}

// Fetch SOL balance with cluster fallback (try mainnet first, then devnet)
async function fetchSolBalanceWithFallback(walletAddress: string): Promise<{ balance: number; cluster: 'mainnet' | 'devnet' }> {
  // Try both in parallel for speed
  const [mainnetResult, devnetResult] = await Promise.all([
    fetchSolBalanceFromRpc(walletAddress, RPC_MAINNET, 'mainnet'),
    fetchSolBalanceFromRpc(walletAddress, RPC_DEVNET, 'devnet'),
  ]);

  console.log(`[sol-balance] Mainnet: ${mainnetResult.balance}, Devnet: ${devnetResult.balance}`);

  // Use whichever has the higher balance
  if (mainnetResult.balance >= devnetResult.balance && mainnetResult.balance > 0) {
    return { balance: mainnetResult.balance, cluster: 'mainnet' };
  } else if (devnetResult.balance > 0) {
    console.log('[sol-balance] CLUSTER_FALLBACK_USED: devnet has higher balance');
    return { balance: devnetResult.balance, cluster: 'devnet' };
  } else if (mainnetResult.balance > 0) {
    return { balance: mainnetResult.balance, cluster: 'mainnet' };
  }

  // Both are 0, default to mainnet
  return { balance: 0, cluster: 'mainnet' };
}

// Fetch SOL/USD price from Coinbase (with caching)
async function fetchSolPrice(): Promise<number> {
  const now = Date.now();
  
  // Return cached price if still valid
  if (priceCache && (now - priceCache.fetchedAt) < PRICE_CACHE_TTL_MS) {
    console.log(`[sol-balance] Using cached SOL price: $${priceCache.price}`);
    return priceCache.price;
  }

  console.log("[sol-balance] Fetching SOL price from Coinbase...");
  
  try {
    const response = await fetch("https://api.coinbase.com/v2/prices/SOL-USD/spot", {
      headers: { "Accept": "application/json" },
    });
    
    if (!response.ok) {
      console.error(`[sol-balance] PRICE_FETCH_FAILED: Coinbase returned ${response.status}`);
      // Return last cached price if available
      return priceCache?.price ?? 0;
    }

    const data = await response.json();
    const price = parseFloat(data.data?.amount ?? "0");
    
    console.log(`[sol-balance] SOL price: $${price}`);
    
    // Update cache
    priceCache = { price, fetchedAt: now };
    
    return price;
  } catch (err) {
    console.error("[sol-balance] PRICE_FETCH_FAILED: Exception:", err);
    return priceCache?.price ?? 0;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { wallet } = await req.json();

    if (!wallet || typeof wallet !== 'string') {
      return new Response(
        JSON.stringify({ error: "INVALID_REQUEST", message: "Wallet address required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[sol-balance] Request for wallet: ${wallet.substring(0, 8)}...`);

    // Fetch balance and price in parallel
    const [balanceResult, solPrice] = await Promise.all([
      fetchSolBalanceWithFallback(wallet),
      fetchSolPrice(),
    ]);

    const { balance: solBalance, cluster } = balanceResult;

    // Calculate wallet USD value and PE
    const walletUsd = solBalance * solPrice;
    const peTotal = Math.floor(walletUsd * PE_PER_USD);

    console.log(`[sol-balance] Result: ${solBalance} SOL × $${solPrice} = $${walletUsd.toFixed(2)} = ${peTotal} PE (${cluster})`);

    return new Response(
      JSON.stringify({
        ok: true,
        solBalance,
        usdPrice: solPrice,
        walletUsd,
        peTotal,
        cluster,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[sol-balance] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: "INTERNAL_ERROR", 
        message: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
