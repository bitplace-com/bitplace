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
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;

    return payload;
  } catch {
    return null;
  }
}

type GameMode = "PAINT" | "DEFEND" | "ATTACK" | "REINFORCE";

interface CommitRequest {
  mode: GameMode;
  pixels: { x: number; y: number }[];
  color?: string;
  pePerPixel?: number;
  snapshotHash: string;
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
  ownerData?: OwnerData;
}

// Rate limiting: in-memory store per instance
const commitTimestamps = new Map<string, number>();
const COMMIT_COOLDOWN_MS = 2000; // min 2 seconds between commits

function checkCommitRateLimit(userId: string): { ok: boolean; retryAfter?: number } {
  const now = Date.now();
  const lastCommit = commitTimestamps.get(userId) || 0;
  
  const timeSinceLastCommit = now - lastCommit;
  if (timeSinceLastCommit < COMMIT_COOLDOWN_MS) {
    const retryAfter = Math.ceil((COMMIT_COOLDOWN_MS - timeSinceLastCommit) / 1000);
    return { ok: false, retryAfter: Math.max(1, retryAfter) };
  }
  
  commitTimestamps.set(userId, now);
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
function calculateThreshold(pixel: PixelData): number {
  const ownerStake = pixel.owner_stake_pe || 0;
  const defSum = pixel.defSum;
  const atkSum = pixel.atkSum;
  const owner = pixel.ownerData;

  if (!owner || !owner.rebalance_active) {
    // Owner is healthy - use current value
    const vNow = ownerStake + defSum - atkSum;
    return Math.max(0, vNow) + 1;
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
    return Math.max(0, vFloor) + 1;
  }

  // Fallback to current multiplier
  const effectiveStake = ownerStake * owner.owner_health_multiplier;
  const vNow = effectiveStake + defSum - atkSum;
  return Math.max(0, vNow) + 1;
}

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
      console.log("[game-commit] Missing or invalid Authorization header");
      return new Response(JSON.stringify({ ok: false, error: "UNAUTHORIZED", message: "Missing authentication token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const authSecret = Deno.env.get("AUTH_SECRET");
    if (!authSecret) {
      console.error("[game-commit] AUTH_SECRET not configured");
      return new Response(JSON.stringify({ ok: false, error: "SERVER_ERROR" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await verifyToken(token, authSecret);
    if (!payload) {
      console.log("[game-commit] Invalid or expired token");
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

    const body: CommitRequest = await req.json();
    const { mode, pixels, color, pePerPixel, snapshotHash } = body;

    console.log("[game-commit] Request:", { userId, mode, pixelCount: pixels?.length, snapshotHash });

    // Input validation
    if (!mode || !pixels || !Array.isArray(pixels) || pixels.length === 0 || !snapshotHash) {
      return new Response(JSON.stringify({ ok: false, error: "INVALID_INPUT" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limiting check
    const rateCheck = checkCommitRateLimit(userId);
    if (!rateCheck.ok) {
      console.log(`[game-commit] Rate limited user ${userId}`);
      return new Response(JSON.stringify({ 
        ok: false, 
        error: "RATE_LIMITED", 
        message: `Please wait ${rateCheck.retryAfter}s before next action` 
      }), {
        status: 429,
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json", 
          "Retry-After": String(rateCheck.retryAfter) 
        },
      });
    }

    // Fetch current pixel states
    const { data: existingPixels, error: pixelsError } = await supabase
      .from("pixels")
      .select("id, x, y, owner_user_id, owner_stake_pe, color")
      .or(pixels.map(p => `and(x.eq.${p.x},y.eq.${p.y})`).join(","));

    if (pixelsError) {
      console.error("[game-commit] Pixels fetch error:", pixelsError);
      return new Response(JSON.stringify({ ok: false, error: "DB_ERROR" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pixelMap = new Map<string, typeof existingPixels[0]>();
    (existingPixels || []).forEach(p => {
      pixelMap.set(`${p.x}:${p.y}`, p);
    });

    // Fetch user data to check contribution collateral
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, pe_total_pe")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      console.error("[game-commit] User fetch error:", userError);
      return new Response(JSON.stringify({ ok: false, error: "USER_NOT_FOUND" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch owner data for rebalance status
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

    // Fetch ALL user's contributions to check collateral
    const { data: allUserContribs } = await supabase
      .from("pixel_contributions")
      .select("amount_pe")
      .eq("user_id", userId);

    const userContribTotal = (allUserContribs || []).reduce((sum, c) => sum + c.amount_pe, 0);

    // Check if user's contributions are under-collateralized
    let contributionsPurged = false;
    let purgedContributionCount = 0;

    if (userContribTotal > user.pe_total_pe) {
      console.log(`[game-commit] User ${userId} contributions under-collateralized: PE=${user.pe_total_pe}, contributions=${userContribTotal}`);
      
      // Delete all user's contributions immediately
      const { data: deleted, error: delError } = await supabase
        .from("pixel_contributions")
        .delete()
        .eq("user_id", userId)
        .select("id");
      
      if (delError) {
        console.error("[game-commit] Failed to purge contributions:", delError);
      } else {
        purgedContributionCount = deleted?.length || 0;
        contributionsPurged = true;
        console.log(`[game-commit] Purged ${purgedContributionCount} contributions for under-collateralized user`);
      }

      // Return error for DEF/ATK modes since user can't contribute
      if (mode === "DEFEND" || mode === "ATTACK") {
        return new Response(JSON.stringify({
          ok: false,
          error: "CONTRIBUTIONS_PURGED",
          message: "Your DEF/ATK contributions were removed due to insufficient collateral",
          contributionsPurged,
          purgedContributionCount,
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fetch contributions for selected pixels
    const pixelIds = (existingPixels || []).map(p => p.id);
    let contributions: { pixel_id: number; user_id: string; side: string; amount_pe: number }[] = [];
    
    if (pixelIds.length > 0) {
      const { data: contribs } = await supabase
        .from("pixel_contributions")
        .select("pixel_id, user_id, side, amount_pe")
        .in("pixel_id", pixelIds);
      contributions = contribs || [];
    }

    // Check for under-collateralized contributors on these pixels and filter them out
    const contributorIds = [...new Set(contributions.map(c => c.user_id))];
    const contributorTotals = new Map<string, number>();
    
    if (contributorIds.length > 0) {
      // Get all contributions for these users (not just on selected pixels)
      const { data: allContribs } = await supabase
        .from("pixel_contributions")
        .select("user_id, amount_pe")
        .in("user_id", contributorIds);
      
      (allContribs || []).forEach(c => {
        const current = contributorTotals.get(c.user_id) || 0;
        contributorTotals.set(c.user_id, current + c.amount_pe);
      });

      // Fetch PE totals for contributors
      const { data: contributorUsers } = await supabase
        .from("users")
        .select("id, pe_total_pe")
        .in("id", contributorIds);

      // Find under-collateralized contributors
      const underCollateralizedContributors = new Set<string>();
      (contributorUsers || []).forEach(u => {
        const contribTotal = contributorTotals.get(u.id) || 0;
        if (u.pe_total_pe < contribTotal) {
          underCollateralizedContributors.add(u.id);
          console.log(`[game-commit] Contributor ${u.id} under-collateralized, excluding their contributions`);
        }
      });

      // Filter out contributions from under-collateralized users
      if (underCollateralizedContributors.size > 0) {
        contributions = contributions.filter(c => !underCollateralizedContributors.has(c.user_id));
      }
    }

    const contribsByPixel = new Map<number, { defSum: number; atkSum: number }>();
    contributions.forEach(c => {
      const existing = contribsByPixel.get(c.pixel_id) || { defSum: 0, atkSum: 0 };
      if (c.side === "DEF") existing.defSum += c.amount_pe;
      else if (c.side === "ATK") existing.atkSum += c.amount_pe;
      contribsByPixel.set(c.pixel_id, existing);
    });

    // Build pixel states and verify hash
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
        ownerData,
      };
    });

    const currentHash = generateSnapshotHash(pixelStates);
    if (currentHash !== snapshotHash) {
      console.log("[game-commit] Hash mismatch:", { expected: snapshotHash, got: currentHash });
      return new Response(JSON.stringify({ ok: false, error: "STATE_CHANGED", message: "Pixel state changed, please re-validate" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Apply changes based on mode
    let affectedPixels = 0;
    const now = new Date().toISOString();

    if (mode === "REINFORCE") {
      // Increase owner_stake_pe for each pixel
      for (const pixel of pixelStates) {
        if (!pixel.id) continue;
        const { error } = await supabase
          .from("pixels")
          .update({ 
            owner_stake_pe: (pixel.owner_stake_pe || 0) + pePerPixel!,
            updated_at: now
          })
          .eq("id", pixel.id);
        
        if (!error) affectedPixels++;
      }
    } else if (mode === "DEFEND" || mode === "ATTACK") {
      const side = mode === "DEFEND" ? "DEF" : "ATK";
      
      for (const pixel of pixelStates) {
        if (!pixel.id) continue;
        
        // Check if user already has contribution on this pixel
        const { data: existing } = await supabase
          .from("pixel_contributions")
          .select("id, amount_pe")
          .eq("pixel_id", pixel.id)
          .eq("user_id", userId)
          .eq("side", side)
          .single();

        if (existing) {
          // Add to existing contribution
          const { error } = await supabase
            .from("pixel_contributions")
            .update({ amount_pe: existing.amount_pe + pePerPixel! })
            .eq("id", existing.id);
          if (!error) affectedPixels++;
        } else {
          // Create new contribution
          const { error } = await supabase
            .from("pixel_contributions")
            .insert({
              pixel_id: pixel.id,
              user_id: userId,
              side,
              amount_pe: pePerPixel!
            });
          if (!error) affectedPixels++;
        }
      }
    } else if (mode === "PAINT") {
      for (const pixel of pixelStates) {
        const isEmpty = !pixel.id;
        const isOwnedByUser = pixel.owner_user_id === userId;

        if (isEmpty) {
          // Insert new pixel with stake of 1
          const { error } = await supabase
            .from("pixels")
            .insert({
              x: pixel.x,
              y: pixel.y,
              color: color!,
              owner_user_id: userId,
              owner_stake_pe: 1,
              created_at: now,
              updated_at: now
            });
          if (!error) affectedPixels++;
        } else if (isOwnedByUser) {
          // Just update color
          const { error } = await supabase
            .from("pixels")
            .update({ color: color!, updated_at: now })
            .eq("id", pixel.id);
          if (!error) affectedPixels++;
        } else {
          // Takeover - use floor-based threshold
          const threshold = calculateThreshold(pixel);

          // 1. Delete all DEF contributions (refund defenders)
          if (pixel.id) {
            await supabase
              .from("pixel_contributions")
              .delete()
              .eq("pixel_id", pixel.id)
              .eq("side", "DEF");
          }

          // 2. Convert ATK to DEF (attackers become defenders)
          if (pixel.id) {
            await supabase
              .from("pixel_contributions")
              .update({ side: "DEF" })
              .eq("pixel_id", pixel.id)
              .eq("side", "ATK");
          }

          // 3. Update pixel with new owner
          const { error } = await supabase
            .from("pixels")
            .update({
              owner_user_id: userId,
              owner_stake_pe: threshold,
              color: color!,
              updated_at: now
            })
            .eq("id", pixel.id);
          
          if (!error) affectedPixels++;
        }
      }
    }

    // Calculate bounding box
    const xs = pixels.map(p => p.x);
    const ys = pixels.map(p => p.y);
    const bbox = {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys)
    };

    // Calculate XP earned
    let xpEarned = 0;
    
    if (mode === "PAINT") {
      // Count paints vs takeovers
      for (const pixel of pixelStates) {
        const isEmpty = !pixel.id;
        const isOwnedByUser = pixel.owner_user_id === userId;
        
        if (isEmpty || isOwnedByUser) {
          xpEarned += 1; // +1 XP for new paint or repaint
        } else {
          xpEarned += 2; // +2 XP for takeover
        }
      }
    } else if (mode === "DEFEND" || mode === "ATTACK") {
      xpEarned = Math.floor(affectedPixels / 10); // +1 XP per 10 pixels
    }
    // REINFORCE gives no XP
    
    // Update user XP and level if earned
    if (xpEarned > 0) {
      const { data: userData } = await supabase
        .from("users")
        .select("xp")
        .eq("id", userId)
        .single();
      
      const currentXp = userData?.xp || 0;
      const newXp = currentXp + xpEarned;
      const newLevel = 1 + Math.floor(Math.sqrt(newXp / 50));
      
      const { error: xpError } = await supabase
        .from("users")
        .update({ xp: newXp, level: newLevel })
        .eq("id", userId);
      
      if (xpError) {
        console.error("[game-commit] XP update error:", xpError);
      } else {
        console.log(`[game-commit] User ${userId} earned ${xpEarned} XP, now at ${newXp} XP (level ${newLevel})`);
      }
    }

    // Log paint event
    const { data: eventData, error: eventError } = await supabase
      .from("paint_events")
      .insert({
        user_id: userId,
        action_type: mode,
        pixel_count: affectedPixels,
        bbox,
        details: { color, pePerPixel, xpEarned },
        created_at: now
      })
      .select("id")
      .single();

    if (eventError) {
      console.error("[game-commit] Event log error:", eventError);
    }

    console.log("[game-commit] Success:", { affectedPixels, xpEarned, eventId: eventData?.id });

    return new Response(JSON.stringify({
      ok: true,
      affectedPixels,
      xpEarned,
      eventId: eventData?.id,
      contributionsPurged,
      purgedContributionCount,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[game-commit] Error:", err);
    return new Response(JSON.stringify({ ok: false, error: "INTERNAL_ERROR", message: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
