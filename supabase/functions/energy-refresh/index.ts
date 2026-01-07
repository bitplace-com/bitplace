import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Allowed origins for CORS (restrict to known origins for authenticated endpoints)
const ALLOWED_ORIGINS = [
  "https://bitplace.app",
  "https://www.bitplace.app",
  "http://localhost:5173",
  "http://localhost:3000",
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
  };
}

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

// Auth token verification using HMAC-SHA256 (3-part JWT format: header.payload.signature)
async function verifyToken(token: string, secret: string): Promise<{ userId: string; wallet: string; exp: number } | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error("[energy-refresh] Invalid token format: expected 3 parts, got", parts.length);
      return null;
    }

    const [headerB64, payloadB64, signatureB64] = parts;
    const encoder = new TextEncoder();
    
    // Import the secret key for HMAC
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // Decode the signature from base64url
    const signatureB64Std = signatureB64.replace(/-/g, '+').replace(/_/g, '/');
    const signatureBytes = Uint8Array.from(atob(signatureB64Std), c => c.charCodeAt(0));

    // Verify the signature against header.payload
    const signatureInput = `${headerB64}.${payloadB64}`;
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      encoder.encode(signatureInput)
    );

    if (!isValid) {
      console.error("[energy-refresh] Invalid signature");
      return null;
    }

    // Decode and parse payload (handle base64url)
    const payloadB64Std = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(payloadB64Std));

    // Check expiration
    if (payload.exp && payload.exp < Date.now()) {
      console.error("[energy-refresh] Token expired");
      return null;
    }

    return {
      userId: payload.userId,
      wallet: payload.wallet,
      exp: payload.exp
    };
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
  const corsHeaders = getCorsHeaders(req);
  
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
    const tokenData = await verifyToken(token, authSecret);
    

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
      
      // Still fetch PE used/available for stale response
      const { data: pixelStakes } = await supabase
        .from("pixels")
        .select("owner_stake_pe")
        .eq("owner_user_id", userId);

      const pixelStakeTotal = (pixelStakes || []).reduce(
        (sum, p) => sum + Number(p.owner_stake_pe || 0), 0
      );

      const { data: contribs } = await supabase
        .from("pixel_contributions")
        .select("amount_pe")
        .eq("user_id", userId);

      const contribTotal = (contribs || []).reduce(
        (sum, c) => sum + Number(c.amount_pe || 0), 0
      );

      const peTotal = Number(userData.pe_total_pe) || 0;
      const peUsed = pixelStakeTotal + contribTotal;
      const peAvailable = Math.max(0, peTotal - peUsed);
      
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
          peTotal,
          peUsed,
          peAvailable,
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

    // ===== COLLATERAL ENFORCEMENT =====
    
    // 1. Compute owner_used (sum of owner_stake_pe for owned pixels)
    const { data: ownedPixels } = await supabase
      .from("pixels")
      .select("owner_stake_pe")
      .eq("owner_user_id", userId);

    const ownerUsed = (ownedPixels || []).reduce(
      (sum, p) => sum + Number(p.owner_stake_pe || 0), 0
    );

    // 2. Compute contrib_used (sum of pixel_contributions for this user)
    const { data: userContribs } = await supabase
      .from("pixel_contributions")
      .select("amount_pe")
      .eq("user_id", userId);

    const contribUsed = (userContribs || []).reduce(
      (sum, c) => sum + Number(c.amount_pe || 0), 0
    );

    console.log(`[energy-refresh] User ${userId}: pe_total=${peTotal}, owner_used=${ownerUsed}, contrib_used=${contribUsed}`);

    // 3. If pe_total < owner_used + contrib_used, DELETE all contributions immediately
    if (peTotal < ownerUsed + contribUsed) {
      console.log(`[energy-refresh] User ${userId} under-collateralized (${peTotal} < ${ownerUsed + contribUsed}), purging all contributions`);
      const { error: deleteError } = await supabase
        .from("pixel_contributions")
        .delete()
        .eq("user_id", userId);
      
      if (deleteError) {
        console.error("[energy-refresh] Failed to delete contributions:", deleteError);
      }
      // Note: Trigger will auto-update pixels.def_total and atk_total
    }

    // 4. Fetch current rebalance state
    const { data: currentUser } = await supabase
      .from("users")
      .select("rebalance_active, rebalance_started_at, rebalance_ends_at, rebalance_target_multiplier")
      .eq("id", userId)
      .single();

    // 5. Check if owner stake requires rebalancing
    const isOwnerUnderCollateralized = peTotal < ownerUsed;
    let rebalanceUpdate: Record<string, any> = {};

    if (isOwnerUnderCollateralized && ownerUsed > 0) {
      // Start or continue rebalance
      if (!currentUser?.rebalance_active) {
        const targetMultiplier = Math.max(0, peTotal / ownerUsed);
        const nowDate = new Date();
        const endsAt = new Date(nowDate.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days
        
        rebalanceUpdate = {
          rebalance_active: true,
          rebalance_started_at: nowDate.toISOString(),
          rebalance_ends_at: endsAt.toISOString(),
          rebalance_target_multiplier: targetMultiplier,
          owner_health_multiplier: 1, // Starts at 1, decays over time
        };
        
        console.log(`[energy-refresh] Started rebalance for ${userId}: target=${targetMultiplier.toFixed(4)}`);
      }
      // If already active, let rebalance-tick handle the multiplier updates
    } else if (currentUser?.rebalance_active) {
      // Re-collateralized - stop rebalance immediately
      rebalanceUpdate = {
        rebalance_active: false,
        owner_health_multiplier: 1,
        rebalance_started_at: null,
        rebalance_ends_at: null,
        rebalance_target_multiplier: null,
      };
      
      console.log(`[energy-refresh] Stopped rebalance for ${userId} (re-collateralized)`);
    }

    // Update user record with cluster info and rebalance state
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
        ...rebalanceUpdate,
      })
      .eq("id", userId);

    if (updateError) {
      console.error("[energy-refresh] Update error:", updateError);
      throw new Error("Failed to update user energy");
    }

    // Calculate final PE used/available after any collateral changes
    const { data: finalPixelStakes } = await supabase
      .from("pixels")
      .select("owner_stake_pe")
      .eq("owner_user_id", userId);

    const finalOwnerUsed = (finalPixelStakes || []).reduce(
      (sum, p) => sum + Number(p.owner_stake_pe || 0), 0
    );

    const { data: finalContribs } = await supabase
      .from("pixel_contributions")
      .select("amount_pe")
      .eq("user_id", userId);

    const finalContribUsed = (finalContribs || []).reduce(
      (sum, c) => sum + Number(c.amount_pe || 0), 0
    );

    const peUsed = finalOwnerUsed + finalContribUsed;
    const peAvailable = Math.max(0, peTotal - peUsed);

    console.log(`[energy-refresh] Final PE status: total=${peTotal}, used=${peUsed}, available=${peAvailable}`);

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
        peUsed,
        peAvailable,
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
