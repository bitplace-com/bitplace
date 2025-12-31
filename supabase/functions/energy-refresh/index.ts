import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// RPC endpoints
const RPC_MAINNET = "https://api.mainnet-beta.solana.com";
const RPC_DEVNET = "https://api.devnet.solana.com";

// In-memory rate limiting (per user)
const userLastRefresh: Map<string, number> = new Map();
const RATE_LIMIT_MS = 10 * 1000; // 10 seconds

// In-memory price cache
let priceCache: { price: number; fetchedAt: number } | null = null;
const PRICE_CACHE_TTL_MS = 30 * 1000; // 30 seconds

// PE rate: 1 PE = $0.001
const PE_PER_USD = 1000;

// Auth token verification
function verifyToken(token: string, authSecret: string): { userId: string; wallet: string } | null {
  try {
    const [payloadB64, sig] = token.split(".");
    const payload = JSON.parse(atob(payloadB64));
    
    // Simple signature check using auth secret
    const encoder = new TextEncoder();
    const key = encoder.encode(authSecret);
    const data = encoder.encode(payloadB64);
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) - hash + data[i] * key[i % key.length]) | 0;
    }
    const expectedSig = Math.abs(hash).toString(36);
    
    if (sig !== expectedSig) {
      console.error("[energy-refresh] Invalid signature");
      return null;
    }
    
    if (payload.exp < Date.now()) {
      console.error("[energy-refresh] Token expired");
      return null;
    }
    
    return { userId: payload.sub, wallet: payload.wallet };
  } catch (err) {
    console.error("[energy-refresh] Token verification error:", err);
    return null;
  }
}

// Fetch SOL balance from a specific RPC
async function fetchSolBalanceFromRpc(walletAddress: string, rpcUrl: string, cluster: string): Promise<{ balance: number; cluster: string }> {
  console.log(`[energy-refresh] Fetching balance from ${cluster}: ${walletAddress.substring(0, 8)}...`);
  
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
      console.error(`[energy-refresh] BALANCE_RPC_FAILED: ${cluster} returned ${response.status}`);
      return { balance: 0, cluster };
    }

    const data = await response.json();
    
    if (data.error) {
      console.error(`[energy-refresh] BALANCE_RPC_FAILED: ${cluster} error: ${data.error.message}`);
      return { balance: 0, cluster };
    }

    const lamports = data.result?.value ?? 0;
    const solBalance = lamports / 1e9;
    
    console.log(`[energy-refresh] ${cluster}: ${solBalance} SOL`);
    return { balance: solBalance, cluster };
  } catch (err) {
    console.error(`[energy-refresh] BALANCE_RPC_FAILED: ${cluster} exception:`, err);
    return { balance: 0, cluster };
  }
}

// Fetch SOL balance with cluster fallback
async function fetchSolBalanceWithFallback(walletAddress: string): Promise<{ balance: number; cluster: 'mainnet' | 'devnet' }> {
  const [mainnetResult, devnetResult] = await Promise.all([
    fetchSolBalanceFromRpc(walletAddress, RPC_MAINNET, 'mainnet'),
    fetchSolBalanceFromRpc(walletAddress, RPC_DEVNET, 'devnet'),
  ]);

  console.log(`[energy-refresh] Mainnet: ${mainnetResult.balance}, Devnet: ${devnetResult.balance}`);

  if (mainnetResult.balance >= devnetResult.balance && mainnetResult.balance > 0) {
    return { balance: mainnetResult.balance, cluster: 'mainnet' };
  } else if (devnetResult.balance > 0) {
    console.log('[energy-refresh] CLUSTER_FALLBACK_USED: devnet has higher balance');
    return { balance: devnetResult.balance, cluster: 'devnet' };
  } else if (mainnetResult.balance > 0) {
    return { balance: mainnetResult.balance, cluster: 'mainnet' };
  }

  return { balance: 0, cluster: 'mainnet' };
}

// Fetch SOL/USD price from Coinbase (with caching)
async function fetchSolPrice(): Promise<number> {
  const now = Date.now();
  
  if (priceCache && (now - priceCache.fetchedAt) < PRICE_CACHE_TTL_MS) {
    console.log(`[energy-refresh] Using cached SOL price: $${priceCache.price}`);
    return priceCache.price;
  }

  console.log("[energy-refresh] Fetching SOL price from Coinbase...");
  
  try {
    const response = await fetch("https://api.coinbase.com/v2/prices/SOL-USD/spot", {
      headers: { "Accept": "application/json" },
    });
    
    if (!response.ok) {
      console.error(`[energy-refresh] PRICE_FETCH_FAILED: Coinbase returned ${response.status}`);
      return priceCache?.price ?? 0;
    }

    const data = await response.json();
    const price = parseFloat(data.data?.amount ?? "0");
    
    console.log(`[energy-refresh] SOL price: $${price}`);
    priceCache = { price, fetchedAt: now };
    
    return price;
  } catch (err) {
    console.error("[energy-refresh] PRICE_FETCH_FAILED: Exception:", err);
    return priceCache?.price ?? 0;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "UNAUTHORIZED", message: "Missing or invalid authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.substring(7);
    const authSecret = Deno.env.get("AUTH_SECRET") || "";
    const tokenData = verifyToken(token, authSecret);

    if (!tokenData) {
      return new Response(
        JSON.stringify({ error: "UNAUTHORIZED", message: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { userId, wallet: tokenWallet } = tokenData;

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch user from DB
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, wallet_address, native_balance, usd_price, wallet_usd, pe_total_pe, last_energy_sync_at, sol_cluster")
      .eq("id", userId)
      .maybeSingle();

    if (userError || !userData) {
      console.error("[energy-refresh] User not found:", userError);
      return new Response(
        JSON.stringify({ error: "USER_NOT_FOUND", message: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const walletAddress = userData.wallet_address;
    if (!walletAddress) {
      return new Response(
        JSON.stringify({ error: "NO_WALLET", message: "User has no wallet address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limit check
    const now = Date.now();
    const lastRefresh = userLastRefresh.get(userId) || 0;
    const timeSinceLastRefresh = now - lastRefresh;

    if (timeSinceLastRefresh < RATE_LIMIT_MS) {
      const waitTime = Math.ceil((RATE_LIMIT_MS - timeSinceLastRefresh) / 1000);
      console.log(`[energy-refresh] Rate limited for user ${userId}, wait ${waitTime}s`);
      
      return new Response(
        JSON.stringify({
          ok: true,
          stale: true,
          waitSeconds: waitTime,
          energyAsset: "SOL",
          nativeSymbol: "SOL",
          nativeBalance: Number(userData.native_balance) || 0,
          usdPrice: Number(userData.usd_price) || 0,
          walletUsd: Number(userData.wallet_usd) || 0,
          peTotal: Number(userData.pe_total_pe) || 0,
          cluster: userData.sol_cluster || 'mainnet',
          lastSyncAt: userData.last_energy_sync_at,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update rate limit timestamp
    userLastRefresh.set(userId, now);

    // Fetch SOL balance with cluster fallback and price
    const [balanceResult, solPrice] = await Promise.all([
      fetchSolBalanceWithFallback(walletAddress),
      fetchSolPrice(),
    ]);

    const { balance: solBalance, cluster } = balanceResult;

    // Calculate wallet USD value and PE
    const walletUsd = solBalance * solPrice;
    const peTotal = Math.floor(walletUsd * PE_PER_USD);

    console.log(`[energy-refresh] User ${userId}: ${solBalance} SOL × $${solPrice} = $${walletUsd.toFixed(2)} = ${peTotal} PE (${cluster})`);

    // Update user record with cluster info
    const syncAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("users")
      .update({
        energy_asset: "SOL",
        native_symbol: "SOL",
        native_balance: solBalance,
        usd_price: solPrice,
        wallet_usd: walletUsd,
        pe_total_pe: peTotal,
        sol_cluster: cluster,
        last_energy_sync_at: syncAt,
      })
      .eq("id", userId);

    if (updateError) {
      console.error("[energy-refresh] Update error:", updateError);
      throw new Error("Failed to update user energy");
    }

    return new Response(
      JSON.stringify({
        ok: true,
        stale: false,
        energyAsset: "SOL",
        nativeSymbol: "SOL",
        nativeBalance: solBalance,
        usdPrice: solPrice,
        walletUsd,
        peTotal,
        cluster,
        lastSyncAt: syncAt,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[energy-refresh] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: "INTERNAL_ERROR", 
        message: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
