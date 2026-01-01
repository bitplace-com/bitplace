import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Verify JWT token - extract userId from token instead of trusting request body
async function verifyToken(token: string, secret: string): Promise<{ wallet: string; userId: string; exp: number } | null> {
  try {
    const [headerB64, payloadB64, signatureB64] = token.split(".");
    if (!headerB64 || !payloadB64 || !signatureB64) return null;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const signatureInput = `${headerB64}.${payloadB64}`;
    const signature = Uint8Array.from(atob(signatureB64.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify("HMAC", key, signature, encoder.encode(signatureInput));
    if (!valid) return null;

    const payload = JSON.parse(atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")));
    // Token expiry is in milliseconds (from auth-verify)
    if (payload.exp && Date.now() > payload.exp) return null;

    return payload;
  } catch {
    return null;
  }
}

type GameMode = "PAINT" | "DEFEND" | "ATTACK" | "REINFORCE";

interface ValidateRequest {
  mode: GameMode;
  pixels: { x: number; y: number }[];
  color?: string;
  pePerPixel?: number;
}

interface InvalidPixel {
  x: number;
  y: number;
  reason: string;
}

interface OwnerData {
  id: string;
  owner_health_multiplier: number;
  rebalance_active: boolean;
  rebalance_started_at: string | null;
  rebalance_ends_at: string | null;
  rebalance_target_multiplier: number | null;
}

interface PixelData {
  x: number;
  y: number;
  id?: number;
  owner_user_id?: string;
  owner_stake_pe?: number;
  color?: string;
  defSum: number;
  atkSum: number;
  userContributionSide?: "DEF" | "ATK";
  ownerData?: OwnerData;
}

// Rate limiting: in-memory store per instance
// Note: Edge functions are stateless, so this only works per instance
// For production, use Redis or database-based rate limiting
const rateLimits = new Map<string, { 
  validateCount: number; 
  validateWindowStart: number;
}>();

const VALIDATE_LIMIT = 5; // max 5 validates per second
const VALIDATE_WINDOW_MS = 1000;

function checkValidateRateLimit(userId: string): { ok: boolean; retryAfter?: number } {
  const now = Date.now();
  let entry = rateLimits.get(userId);
  
  if (!entry) {
    entry = { validateCount: 0, validateWindowStart: now };
    rateLimits.set(userId, entry);
  }
  
  // Reset window if expired
  if (now - entry.validateWindowStart > VALIDATE_WINDOW_MS) {
    entry.validateCount = 0;
    entry.validateWindowStart = now;
  }
  
  if (entry.validateCount >= VALIDATE_LIMIT) {
    const retryAfter = Math.ceil((entry.validateWindowStart + VALIDATE_WINDOW_MS - now) / 1000);
    return { ok: false, retryAfter: Math.max(1, retryAfter) };
  }
  
  entry.validateCount++;
  return { ok: true };
}

// Constants for rebalance calculations
const TICK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

/**
 * Get the next tick time (rounded up to next 6h boundary).
 */
function getNextTickTime(now: Date): Date {
  const ms = now.getTime();
  const nextTick = Math.ceil(ms / TICK_INTERVAL_MS) * TICK_INTERVAL_MS;
  return new Date(nextTick);
}

/**
 * Calculate multiplier at a specific time during rebalance.
 */
function calculateMultiplierAtTime(
  startedAt: Date,
  endsAt: Date,
  targetMultiplier: number,
  atTime: Date
): number {
  const totalDuration = endsAt.getTime() - startedAt.getTime();
  const elapsed = atTime.getTime() - startedAt.getTime();
  
  if (elapsed <= 0) return 1;
  if (elapsed >= totalDuration) return targetMultiplier;
  
  const progress = elapsed / totalDuration;
  return 1 - (1 - targetMultiplier) * progress;
}

/**
 * Calculate threshold for taking over a pixel.
 * Uses floor-based calculation for rebalancing owners.
 */
function calculateThreshold(pixel: PixelData): { threshold: number; vFloor?: number; isFloorBased: boolean } {
  const ownerStake = pixel.owner_stake_pe || 0;
  const defSum = pixel.defSum;
  const atkSum = pixel.atkSum;
  const owner = pixel.ownerData;

  if (!owner || !owner.rebalance_active) {
    // Owner is healthy - use current value
    const vNow = ownerStake + defSum - atkSum;
    const vClamped = Math.max(0, vNow);
    return { threshold: vClamped + 1, isFloorBased: false };
  }

  // Owner is in rebalance - calculate floor at next tick
  const now = new Date();
  const nextTick = getNextTickTime(now);
  
  if (owner.rebalance_started_at && owner.rebalance_ends_at && owner.rebalance_target_multiplier !== null) {
    const multiplierAtNextTick = calculateMultiplierAtTime(
      new Date(owner.rebalance_started_at),
      new Date(owner.rebalance_ends_at),
      owner.rebalance_target_multiplier,
      nextTick
    );
    
    const effectiveStakeAtFloor = ownerStake * multiplierAtNextTick;
    const vFloor = effectiveStakeAtFloor + defSum - atkSum;
    const vClamped = Math.max(0, vFloor);
    
    return { 
      threshold: vClamped + 1, 
      vFloor: vFloor,
      isFloorBased: true 
    };
  }

  // Fallback to current multiplier
  const effectiveStake = ownerStake * owner.owner_health_multiplier;
  const vNow = effectiveStake + defSum - atkSum;
  const vClamped = Math.max(0, vNow);
  return { threshold: vClamped + 1, isFloorBased: true };
}

// Generate a hash from pixel states for optimistic locking
function generateSnapshotHash(pixelStates: PixelData[]): string {
  const data = pixelStates.map(p => {
    const multiplier = p.ownerData?.owner_health_multiplier || 1;
    return `${p.x}:${p.y}:${p.id || 0}:${p.owner_user_id || ''}:${p.owner_stake_pe || 0}:${p.defSum}:${p.atkSum}:${multiplier.toFixed(4)}`;
  }).join("|");
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT token from Authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("[game-validate] Missing or invalid Authorization header");
      return new Response(JSON.stringify({ ok: false, error: "UNAUTHORIZED", message: "Missing authentication token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const authSecret = Deno.env.get("AUTH_SECRET");
    if (!authSecret) {
      console.error("[game-validate] AUTH_SECRET not configured");
      return new Response(JSON.stringify({ ok: false, error: "SERVER_ERROR" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await verifyToken(token, authSecret);
    if (!payload) {
      console.log("[game-validate] Invalid or expired token");
      return new Response(JSON.stringify({ ok: false, error: "UNAUTHORIZED", message: "Invalid or expired token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract userId from verified token - DO NOT trust request body for userId
    const userId = payload.userId;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: ValidateRequest = await req.json();
    const { mode, pixels, color, pePerPixel } = body;

    console.log("[game-validate] Request:", { userId, mode, pixelCount: pixels?.length, color, pePerPixel });

    // Input validation
    if (!mode || !pixels || !Array.isArray(pixels) || pixels.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: "INVALID_INPUT", message: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limiting check
    const rateCheck = checkValidateRateLimit(userId);
    if (!rateCheck.ok) {
      console.log(`[game-validate] Rate limited user ${userId}`);
      return new Response(JSON.stringify({ 
        ok: false, 
        error: "RATE_LIMITED", 
        message: `Too many requests. Retry in ${rateCheck.retryAfter}s` 
      }), {
        status: 429,
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json", 
          "Retry-After": String(rateCheck.retryAfter) 
        },
      });
    }

    if (pixels.length > 1000) {
      return new Response(JSON.stringify({ ok: false, error: "TOO_MANY_PIXELS", message: "Max 1000 pixels per request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["PAINT", "DEFEND", "ATTACK", "REINFORCE"].includes(mode)) {
      return new Response(JSON.stringify({ ok: false, error: "INVALID_MODE" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mode-specific validation
    if (mode === "PAINT") {
      if (!color || !/^#[0-9A-Fa-f]{6}$/.test(color)) {
        return new Response(JSON.stringify({ ok: false, error: "INVALID_COLOR", message: "PAINT requires valid hex color" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      if (!pePerPixel || pePerPixel < 1 || !Number.isInteger(pePerPixel)) {
        return new Response(JSON.stringify({ ok: false, error: "INVALID_PE", message: `${mode} requires positive integer pePerPixel` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fetch user data
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, pe_total_pe")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      console.error("[game-validate] User fetch error:", userError);
      return new Response(JSON.stringify({ ok: false, error: "USER_NOT_FOUND" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all pixels at selected coordinates
    const { data: existingPixels, error: pixelsError } = await supabase
      .from("pixels")
      .select("id, x, y, owner_user_id, owner_stake_pe, color")
      .or(pixels.map(p => `and(x.eq.${p.x},y.eq.${p.y})`).join(","));

    if (pixelsError) {
      console.error("[game-validate] Pixels fetch error:", pixelsError);
      return new Response(JSON.stringify({ ok: false, error: "DB_ERROR" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create a map of existing pixels
    const pixelMap = new Map<string, typeof existingPixels[0]>();
    (existingPixels || []).forEach(p => {
      pixelMap.set(`${p.x}:${p.y}`, p);
    });

    // Fetch owner data for all pixel owners (for rebalance status)
    const ownerIds = [...new Set((existingPixels || []).map(p => p.owner_user_id).filter(Boolean))];
    const ownerDataMap = new Map<string, OwnerData>();
    
    if (ownerIds.length > 0) {
      const { data: owners } = await supabase
        .from("users")
        .select("id, owner_health_multiplier, rebalance_active, rebalance_started_at, rebalance_ends_at, rebalance_target_multiplier")
        .in("id", ownerIds);
      
      (owners || []).forEach(o => {
        ownerDataMap.set(o.id, o);
      });
    }

    // Fetch contributions on selected pixels
    const pixelIds = (existingPixels || []).map(p => p.id);
    let contributions: { pixel_id: number; user_id: string; side: string; amount_pe: number }[] = [];
    
    if (pixelIds.length > 0) {
      const { data: contribs, error: contribsError } = await supabase
        .from("pixel_contributions")
        .select("pixel_id, user_id, side, amount_pe")
        .in("pixel_id", pixelIds);
      
      if (contribsError) {
        console.error("[game-validate] Contributions fetch error:", contribsError);
      } else {
        contributions = contribs || [];
      }
    }

    // Group contributions by pixel
    const contribsByPixel = new Map<number, { defSum: number; atkSum: number; userSide?: "DEF" | "ATK" }>();
    contributions.forEach(c => {
      const existing = contribsByPixel.get(c.pixel_id) || { defSum: 0, atkSum: 0 };
      if (c.side === "DEF") {
        existing.defSum += c.amount_pe;
      } else if (c.side === "ATK") {
        existing.atkSum += c.amount_pe;
      }
      if (c.user_id === userId) {
        existing.userSide = c.side as "DEF" | "ATK";
      }
      contribsByPixel.set(c.pixel_id, existing);
    });

    // Fetch all user's staked PE (owned pixels + contributions)
    const { data: userOwnedPixels, error: ownedError } = await supabase
      .from("pixels")
      .select("owner_stake_pe")
      .eq("owner_user_id", userId);

    const { data: userContributions, error: userContribError } = await supabase
      .from("pixel_contributions")
      .select("amount_pe")
      .eq("user_id", userId);

    const ownedStakeSum = (userOwnedPixels || []).reduce((sum, p) => sum + (p.owner_stake_pe || 0), 0);
    const contributionsSum = (userContributions || []).reduce((sum, c) => sum + c.amount_pe, 0);
    
    // Check if user's contributions are under-collateralized
    // DEF/ATK have NO decay - they disappear immediately
    let contributionsPurged = false;
    let purgedContributionCount = 0;
    
    if (contributionsSum > user.pe_total_pe) {
      console.log(`[game-validate] User ${userId} contributions under-collateralized: PE=${user.pe_total_pe}, contributions=${contributionsSum}`);
      
      // Delete all user's contributions immediately
      const { data: deleted, error: delError } = await supabase
        .from("pixel_contributions")
        .delete()
        .eq("user_id", userId)
        .select("id");
      
      if (delError) {
        console.error("[game-validate] Failed to purge contributions:", delError);
      } else {
        purgedContributionCount = deleted?.length || 0;
        contributionsPurged = true;
        console.log(`[game-validate] Purged ${purgedContributionCount} contributions for under-collateralized user`);
        
        // Update contributions map to remove user's contributions
        contributions = contributions.filter(c => c.user_id !== userId);
        
        // Recalculate contribsByPixel without user's contributions
        contribsByPixel.clear();
        contributions.forEach(c => {
          const existing = contribsByPixel.get(c.pixel_id) || { defSum: 0, atkSum: 0 };
          if (c.side === "DEF") {
            existing.defSum += c.amount_pe;
          } else if (c.side === "ATK") {
            existing.atkSum += c.amount_pe;
          }
          if (c.user_id === userId) {
            existing.userSide = c.side as "DEF" | "ATK";
          }
          contribsByPixel.set(c.pixel_id, existing);
        });
      }
    }

    const peStaked = ownedStakeSum + (contributionsPurged ? 0 : contributionsSum);
    const peFree = user.pe_total_pe - peStaked;

    console.log("[game-validate] PE status:", { total: user.pe_total_pe, staked: peStaked, free: peFree, contributionsPurged });

    // Build enriched pixel data
    const pixelStates: PixelData[] = pixels.map(p => {
      const existing = pixelMap.get(`${p.x}:${p.y}`);
      const contribs = existing ? contribsByPixel.get(existing.id) : undefined;
      const ownerData = existing?.owner_user_id ? ownerDataMap.get(existing.owner_user_id) : undefined;
      return {
        x: p.x,
        y: p.y,
        id: existing?.id,
        owner_user_id: existing?.owner_user_id,
        owner_stake_pe: existing?.owner_stake_pe || 0,
        color: existing?.color,
        defSum: contribs?.defSum || 0,
        atkSum: contribs?.atkSum || 0,
        userContributionSide: contribs?.userSide,
        ownerData,
      };
    });

    // Validate each pixel and compute required PE
    const invalidPixels: InvalidPixel[] = [];
    let requiredPeTotal = 0;
    let ownedByUser = 0;
    let ownedByOthers = 0;
    let emptyCount = 0;
    let floorBasedCount = 0;
    const breakdown: { [key: string]: number } = {};

    for (const pixel of pixelStates) {
      const isEmpty = !pixel.id;
      const isOwnedByUser = pixel.owner_user_id === userId;
      const isOwnedByOthers = !isEmpty && !isOwnedByUser;

      if (isEmpty) emptyCount++;
      else if (isOwnedByUser) ownedByUser++;
      else ownedByOthers++;

      // Ownership rules
      if (mode === "REINFORCE") {
        if (!isOwnedByUser) {
          invalidPixels.push({ x: pixel.x, y: pixel.y, reason: "NOT_OWNER" });
          continue;
        }
        requiredPeTotal += pePerPixel!;
      } else if (mode === "DEFEND" || mode === "ATTACK") {
        if (isEmpty) {
          invalidPixels.push({ x: pixel.x, y: pixel.y, reason: "EMPTY_PIXEL" });
          continue;
        }
        if (isOwnedByUser) {
          invalidPixels.push({ x: pixel.x, y: pixel.y, reason: "IS_OWNER" });
          continue;
        }
        // Side restriction
        const oppositeSide = mode === "DEFEND" ? "ATK" : "DEF";
        if (pixel.userContributionSide === oppositeSide) {
          invalidPixels.push({ x: pixel.x, y: pixel.y, reason: "OPPOSITE_SIDE" });
          continue;
        }
        requiredPeTotal += pePerPixel!;
      } else if (mode === "PAINT") {
        if (isEmpty) {
          requiredPeTotal += 1;
          breakdown["empty"] = (breakdown["empty"] || 0) + 1;
        } else if (isOwnedByUser) {
          // Just color change, no PE required
          breakdown["colorChange"] = (breakdown["colorChange"] || 0) + 1;
        } else {
          // Takeover - calculate threshold using floor if applicable
          const { threshold, isFloorBased } = calculateThreshold(pixel);
          requiredPeTotal += threshold;
          breakdown["takeover"] = (breakdown["takeover"] || 0) + 1;
          breakdown[`threshold_${pixel.x}_${pixel.y}`] = threshold;
          if (isFloorBased) floorBasedCount++;
        }
      }
    }

    // Check PE availability
    if (invalidPixels.length === 0 && requiredPeTotal > peFree) {
      return new Response(JSON.stringify({
        ok: false,
        error: "INSUFFICIENT_PE",
        message: `Need ${requiredPeTotal} PE but only ${peFree} available`,
        requiredPeTotal,
        availablePe: peFree,
        invalidPixels: [],
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate snapshot hash for optimistic locking
    const snapshotHash = generateSnapshotHash(pixelStates);

    const result = {
      ok: invalidPixels.length === 0,
      requiredPeTotal,
      snapshotHash,
      invalidPixels,
      breakdown: {
        pixelCount: pixels.length,
        ownedByUser,
        ownedByOthers,
        empty: emptyCount,
        floorBasedCount,
        pePerType: breakdown,
      },
      availablePe: peFree,
      contributionsPurged,
      purgedContributionCount,
    };

    console.log("[game-validate] Result:", { ok: result.ok, requiredPeTotal, invalidCount: invalidPixels.length, floorBasedCount, contributionsPurged });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[game-validate] Error:", err);
    return new Response(JSON.stringify({ ok: false, error: "INTERNAL_ERROR", message: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
