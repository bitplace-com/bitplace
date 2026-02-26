import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Allowed origins for CORS (restrict to known origins for authenticated endpoints)
const ALLOWED_ORIGINS = [
  "https://bitplace.com",
  "https://www.bitplace.com",
  "http://localhost:5173",
  "http://localhost:3000",
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  const isAllowed = ALLOWED_ORIGINS.includes(origin) || 
    origin.endsWith('.lovableproject.com') ||
    origin.endsWith('.lovable.app');
  const allowedOrigin = isAllowed ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
  };
}

// $BIT token configuration
const BIT_TOKEN_MINT = "6az8wE4Gmns7bPLwfeR9Ed9pnGjqN5Cv9FJ3vs4Cpump";
const BIT_DECIMALS = 6;
const RPC_MAINNET = "https://api.mainnet-beta.solana.com";

// In-memory rate limiting (per user)
const userLastRefresh: Map<string, number> = new Map();
const RATE_LIMIT_MS = 10 * 1000; // 10 seconds

// In-memory price cache
let priceCache: { price: number; fetchedAt: number } | null = null;
const PRICE_CACHE_TTL_MS = 30 * 1000; // 30 seconds

// PE rate: 1 PE = $0.001
const PE_PER_USD = 1000;

// Auth token verification using HMAC-SHA256 (3-part JWT format: header.payload.signature)
async function verifyToken(token: string, secret: string): Promise<{ userId: string; wallet: string; exp: number; authProvider?: string } | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error("[energy-refresh] Invalid token format: expected 3 parts, got", parts.length);
      return null;
    }

    const [headerB64, payloadB64, signatureB64] = parts;
    const encoder = new TextEncoder();
    
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signatureB64Std = signatureB64.replace(/-/g, '+').replace(/_/g, '/');
    const signatureBytes = Uint8Array.from(atob(signatureB64Std), c => c.charCodeAt(0));

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

    const payloadB64Std = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(payloadB64Std));

    if (payload.exp && payload.exp < Date.now()) {
      console.error("[energy-refresh] Token expired");
      return null;
    }

    return {
      userId: payload.userId,
      wallet: payload.wallet,
      exp: payload.exp,
      authProvider: payload.authProvider,
    };
  } catch (err) {
    console.error("[energy-refresh] Token verification error:", err);
    return null;
  }
}

// Fetch $BIT SPL token balance from Solana RPC (mainnet only)
async function fetchBitBalance(walletAddress: string): Promise<number> {
  console.log(`[energy-refresh] Fetching $BIT balance for ${walletAddress.substring(0, 8)}...`);

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
      console.error(`[energy-refresh] BALANCE_RPC_FAILED: mainnet returned ${response.status}`);
      return 0;
    }

    const data = await response.json();

    if (data.error) {
      console.error(`[energy-refresh] BALANCE_RPC_FAILED: ${data.error.message}`);
      return 0;
    }

    const accounts = data.result?.value || [];
    if (accounts.length === 0) {
      console.log("[energy-refresh] No $BIT token account found (balance = 0)");
      return 0;
    }

    let totalRaw = 0;
    for (const account of accounts) {
      const info = account.account?.data?.parsed?.info;
      if (info) {
        totalRaw += Number(info.tokenAmount?.amount || 0);
      }
    }

    const balance = totalRaw / Math.pow(10, BIT_DECIMALS);
    console.log(`[energy-refresh] $BIT balance: ${balance}`);
    return balance;
  } catch (err) {
    console.error("[energy-refresh] BALANCE_RPC_FAILED: exception:", err);
    return 0;
  }
}

// Fetch $BIT/USD price from DexScreener (with caching)
async function fetchBitPrice(): Promise<number> {
  const now = Date.now();

  if (priceCache && (now - priceCache.fetchedAt) < PRICE_CACHE_TTL_MS) {
    console.log(`[energy-refresh] Using cached $BIT price: $${priceCache.price}`);
    return priceCache.price;
  }

  console.log("[energy-refresh] Fetching $BIT price from DexScreener...");

  try {
    const response = await fetch(
      `https://api.dexscreener.com/token-pairs/v1/solana/${BIT_TOKEN_MINT}`,
      { headers: { Accept: "application/json" } }
    );

    if (!response.ok) {
      console.error(`[energy-refresh] PRICE_FETCH_FAILED: DexScreener returned ${response.status}`);
      return priceCache?.price ?? 0;
    }

    const data = await response.json();
    const pairs = Array.isArray(data) ? data : data.pairs || [];
    const price = parseFloat(pairs[0]?.priceUsd ?? "0");

    if (price <= 0) {
      console.error("[energy-refresh] PRICE_FETCH_FAILED: No valid price from DexScreener");
      return priceCache?.price ?? 0;
    }

    console.log(`[energy-refresh] $BIT price: $${price}`);
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

    // Initialize Supabase client with service role (bypasses RLS)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Fetch user from DB
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, wallet_address, native_balance, usd_price, wallet_usd, pe_total_pe, pe_used_pe, last_energy_sync_at, pixels_painted_total, level, paint_cooldown_until, auth_provider, virtual_pe_total, virtual_pe_used")
      .eq("id", userId)
      .maybeSingle();

    if (userError || !userData) {
      console.error("[energy-refresh] User not found:", userError);
      return new Response(
        JSON.stringify({ error: "USER_NOT_FOUND", message: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authProvider = userData.auth_provider || 'wallet';
    const isGoogleOnly = authProvider === 'google';
    const walletAddress = userData.wallet_address;

    // Paint cooldown helper
    const getPaintCooldown = () => {
      let paintCooldownUntil: string | null = null;
      let paintCooldownRemainingSeconds = 0;
      if (userData.paint_cooldown_until) {
        const cooldownTime = new Date(userData.paint_cooldown_until);
        const nowTime = new Date();
        if (nowTime < cooldownTime) {
          paintCooldownUntil = cooldownTime.toISOString();
          paintCooldownRemainingSeconds = Math.ceil((cooldownTime.getTime() - nowTime.getTime()) / 1000);
        }
      }
      return { paintCooldownUntil, paintCooldownRemainingSeconds };
    };

    // ============ GOOGLE-ONLY USERS: Return virtual PE stats, skip Solana RPC ============
    if (isGoogleOnly) {
      console.log(`[energy-refresh] Google-only user ${userId}, returning virtual PE stats`);
      
      const virtualPeTotal = Number(userData.virtual_pe_total) || 0;
      const virtualPeUsed = Number(userData.virtual_pe_used) || 0;
      const virtualPeAvailable = Math.max(0, virtualPeTotal - virtualPeUsed);

      const { count: pixelsOwned } = await supabase
        .from("pixels")
        .select("*", { count: "exact", head: true })
        .eq("owner_user_id", userId);

      const { paintCooldownUntil, paintCooldownRemainingSeconds } = getPaintCooldown();

      return new Response(
        JSON.stringify({
          ok: true,
          stale: false,
          isVirtualPe: true,
          energyAsset: "BIT",
          nativeSymbol: "BIT",
          nativeBalance: 0,
          usdPrice: 0,
          walletUsd: 0,
          peTotal: virtualPeTotal,
          peUsed: virtualPeUsed,
          peAvailable: virtualPeAvailable,
          virtualPeTotal: virtualPeTotal,
          virtualPeUsed: virtualPeUsed,
          virtualPeAvailable: virtualPeAvailable,
          pixelsOwned: pixelsOwned || 0,
          pixelStakeTotal: 0,
          lastSyncAt: new Date().toISOString(),
          pixelsPaintedTotal: Number(userData.pixels_painted_total) || 0,
          level: userData.level || 1,
          paintCooldownUntil,
          paintCooldownRemainingSeconds,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============ WALLET USERS (wallet or both): Normal Solana RPC flow ============
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
      
      const { count: pixelsOwned } = await supabase
        .from("pixels")
        .select("*", { count: "exact", head: true })
        .eq("owner_user_id", userId);

      const peTotal = Number(userData.pe_total_pe) || 0;
      const peUsed = Number(userData.pe_used_pe) || 0;
      const peAvailable = Math.max(0, peTotal - peUsed);
      const pixelStakeTotal = peUsed;

      const { paintCooldownUntil, paintCooldownRemainingSeconds } = getPaintCooldown();
      
      // Include virtual PE info for 'both' users
      const virtualPeFields = authProvider === 'both' ? {
        isVirtualPe: false,
        virtualPeTotal: Number(userData.virtual_pe_total) || 0,
        virtualPeUsed: Number(userData.virtual_pe_used) || 0,
        virtualPeAvailable: Math.max(0, (Number(userData.virtual_pe_total) || 0) - (Number(userData.virtual_pe_used) || 0)),
      } : {};
      
      return new Response(
        JSON.stringify({
          ok: true,
          stale: true,
          waitSeconds: waitTime,
          energyAsset: "BIT",
          nativeSymbol: "BIT",
          nativeBalance: Number(userData.native_balance) || 0,
          usdPrice: Number(userData.usd_price) || 0,
          walletUsd: Number(userData.wallet_usd) || 0,
          peTotal,
          peUsed,
          peAvailable,
          pixelsOwned,
          pixelStakeTotal,
          lastSyncAt: userData.last_energy_sync_at,
          pixelsPaintedTotal: Number(userData.pixels_painted_total) || 0,
          level: userData.level || 1,
          paintCooldownUntil,
          paintCooldownRemainingSeconds,
          ...virtualPeFields,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update rate limit timestamp
    userLastRefresh.set(userId, now);

    // Fetch $BIT balance and price in parallel
    const [bitBalance, bitPrice] = await Promise.all([
      fetchBitBalance(walletAddress),
      fetchBitPrice(),
    ]);

    // Calculate wallet USD value and PE
    const walletUsd = bitBalance * bitPrice;
    const peTotal = Math.floor(walletUsd * PE_PER_USD);

    console.log(`[energy-refresh] User ${userId}: ${bitBalance} BIT × $${bitPrice} = $${walletUsd.toFixed(4)} = ${peTotal} PE`);

    // ===== COLLATERAL ENFORCEMENT =====
    
    const peUsedFromDb = Number(userData.pe_used_pe) || 0;

    const { data: userContribs } = await supabase
      .from("pixel_contributions")
      .select("amount_pe")
      .eq("user_id", userId);

    const contribUsed = (userContribs || []).reduce(
      (sum, c) => sum + Number(c.amount_pe || 0), 0
    );
    
    const ownerUsed = peUsedFromDb - contribUsed;

    console.log(`[energy-refresh] User ${userId}: pe_total=${peTotal}, owner_used=${ownerUsed}, contrib_used=${contribUsed}`);

    if (peTotal < ownerUsed + contribUsed) {
      console.log(`[energy-refresh] User ${userId} under-collateralized (${peTotal} < ${ownerUsed + contribUsed}), purging all contributions`);
      const { error: deleteError } = await supabase
        .from("pixel_contributions")
        .delete()
        .eq("user_id", userId);
      
      if (deleteError) {
        console.error("[energy-refresh] Failed to delete contributions:", deleteError);
      }
    }

    // Fetch current rebalance state
    const { data: currentUser } = await supabase
      .from("users")
      .select("rebalance_active, rebalance_started_at, rebalance_ends_at, rebalance_target_multiplier")
      .eq("id", userId)
      .single();

    const isOwnerUnderCollateralized = peTotal < ownerUsed;
    let rebalanceUpdate: Record<string, any> = {};

    if (isOwnerUnderCollateralized && ownerUsed > 0) {
      if (!currentUser?.rebalance_active) {
        const targetMultiplier = Math.max(0, peTotal / ownerUsed);
        const nowDate = new Date();
        const endsAt = new Date(nowDate.getTime() + 3 * 24 * 60 * 60 * 1000);
        
        rebalanceUpdate = {
          rebalance_active: true,
          rebalance_started_at: nowDate.toISOString(),
          rebalance_ends_at: endsAt.toISOString(),
          rebalance_target_multiplier: targetMultiplier,
          owner_health_multiplier: 1,
        };
        
        console.log(`[energy-refresh] Started rebalance for ${userId}: target=${targetMultiplier.toFixed(4)}`);
      }
    } else if (currentUser?.rebalance_active) {
      rebalanceUpdate = {
        rebalance_active: false,
        owner_health_multiplier: 1,
        rebalance_started_at: null,
        rebalance_ends_at: null,
        rebalance_target_multiplier: null,
      };
      
      console.log(`[energy-refresh] Stopped rebalance for ${userId} (re-collateralized)`);
    }

    // Update user record
    const syncAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("users")
      .update({
        energy_asset: "BIT",
        native_symbol: "BIT",
        native_balance: bitBalance,
        usd_price: bitPrice,
        wallet_usd: walletUsd,
        pe_total_pe: peTotal,
        last_energy_sync_at: syncAt,
        last_balance_verified_at: syncAt,
        ...rebalanceUpdate,
      })
      .eq("id", userId);

    if (updateError) {
      console.error("[energy-refresh] Update error:", updateError);
      throw new Error("Failed to update user energy");
    }

    // Fetch fresh pe_used_pe from DB (triggers have updated it)
    const [freshUserResult, finalPixelCountResult] = await Promise.all([
      supabase
        .from("users")
        .select("pe_used_pe")
        .eq("id", userId)
        .single(),
      supabase
        .from("pixels")
        .select("*", { count: "exact", head: true })
        .eq("owner_user_id", userId),
    ]);

    const finalPixelsOwned = finalPixelCountResult.count || 0;
    const peUsed = Number(freshUserResult.data?.pe_used_pe) || 0;
    const peAvailable = Math.max(0, peTotal - peUsed);
    const finalPixelStakeTotal = ownerUsed;

    console.log(`[energy-refresh] Final PE status: total=${peTotal}, used=${peUsed}, available=${peAvailable}, pixelsOwned=${finalPixelsOwned}`);

    const { paintCooldownUntil, paintCooldownRemainingSeconds } = getPaintCooldown();

    // Include virtual PE info for 'both' users
    const virtualPeFields = authProvider === 'both' ? {
      isVirtualPe: false,
      virtualPeTotal: Number(userData.virtual_pe_total) || 0,
      virtualPeUsed: Number(userData.virtual_pe_used) || 0,
      virtualPeAvailable: Math.max(0, (Number(userData.virtual_pe_total) || 0) - (Number(userData.virtual_pe_used) || 0)),
    } : {};

    return new Response(
      JSON.stringify({
        ok: true,
        stale: false,
        energyAsset: "BIT",
        nativeSymbol: "BIT",
        nativeBalance: bitBalance,
        usdPrice: bitPrice,
        walletUsd,
        peTotal,
        peUsed,
        peAvailable,
        pixelsOwned: finalPixelsOwned,
        pixelStakeTotal: finalPixelStakeTotal,
        lastSyncAt: syncAt,
        pixelsPaintedTotal: Number(userData.pixels_painted_total) || 0,
        level: userData.level || 1,
        paintCooldownUntil,
        paintCooldownRemainingSeconds,
        ...virtualPeFields,
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