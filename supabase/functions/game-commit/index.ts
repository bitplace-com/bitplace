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
    if (payload.exp && Date.now() > payload.exp) return null;

    return payload;
  } catch {
    return null;
  }
}

type GameMode = "PAINT" | "DEFEND" | "ATTACK" | "REINFORCE" | "ERASE";

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

const commitTimestamps = new Map<string, number>();
const COMMIT_COOLDOWN_MS = 2000;

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

const TICK_INTERVAL_MS = 6 * 60 * 60 * 1000;

function getNextTickTime(now: Date): Date {
  const ms = now.getTime();
  const nextTick = Math.ceil(ms / TICK_INTERVAL_MS) * TICK_INTERVAL_MS;
  return new Date(nextTick);
}

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

function calculateThreshold(pixel: PixelData): number {
  const ownerStake = pixel.owner_stake_pe || 0;
  const defSum = pixel.defSum;
  const atkSum = pixel.atkSum;
  const owner = pixel.ownerData;

  if (!owner || !owner.rebalance_active) {
    const vNow = ownerStake + defSum - atkSum;
    return Math.max(0, vNow) + 1;
  }

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
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ ok: false, error: "UNAUTHORIZED", message: "Missing authentication token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const authSecret = Deno.env.get("AUTH_SECRET");
    if (!authSecret) {
      return new Response(JSON.stringify({ ok: false, error: "SERVER_ERROR" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await verifyToken(token, authSecret);
    if (!payload) {
      return new Response(JSON.stringify({ ok: false, error: "UNAUTHORIZED", message: "Invalid or expired token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = payload.userId;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: CommitRequest = await req.json();
    const { mode, pixels: rawPixels, color, pePerPixel, snapshotHash } = body;

    // Deduplicate pixels
    const pixelSet = new Set<string>();
    const pixels = (rawPixels || []).filter((p: { x: number; y: number }) => {
      const key = `${p.x}:${p.y}`;
      if (pixelSet.has(key)) return false;
      pixelSet.add(key);
      return true;
    });

    console.log("[game-commit] Request:", { userId, mode, pixelCount: pixels.length, snapshotHash });

    if (!mode || !pixels || !Array.isArray(pixels) || pixels.length === 0 || !snapshotHash) {
      return new Response(JSON.stringify({ ok: false, error: "INVALID_INPUT" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rateCheck = checkCommitRateLimit(userId);
    if (!rateCheck.ok) {
      return new Response(JSON.stringify({ 
        ok: false, 
        error: "RATE_LIMITED", 
        message: `Please wait ${rateCheck.retryAfter}s before next action` 
      }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(rateCheck.retryAfter) },
      });
    }

    // Fetch current pixel states
    const { data: existingPixels, error: pixelsError } = await supabase
      .from("pixels")
      .select("id, x, y, owner_user_id, owner_stake_pe, color")
      .or(pixels.map(p => `and(x.eq.${p.x},y.eq.${p.y})`).join(","));

    if (pixelsError) {
      return new Response(JSON.stringify({ ok: false, error: "DB_ERROR" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pixelMap = new Map<string, typeof existingPixels[0]>();
    (existingPixels || []).forEach(p => {
      pixelMap.set(`${p.x}:${p.y}`, p);
    });

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, pe_total_pe")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      return new Response(JSON.stringify({ ok: false, error: "USER_NOT_FOUND" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch owner data
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

    // Check user's contributions for under-collateralization
    const { data: allUserContribs } = await supabase
      .from("pixel_contributions")
      .select("amount_pe")
      .eq("user_id", userId);

    const userContribTotal = (allUserContribs || []).reduce((sum, c) => sum + c.amount_pe, 0);

    let contributionsPurged = false;
    let purgedContributionCount = 0;

    if (userContribTotal > user.pe_total_pe) {
      const { data: deleted, error: delError } = await supabase
        .from("pixel_contributions")
        .delete()
        .eq("user_id", userId)
        .select("id");
      
      if (!delError) {
        purgedContributionCount = deleted?.length || 0;
        contributionsPurged = true;
      }

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

    // Check contributors' collateral
    const contributorIds = [...new Set(contributions.map(c => c.user_id))];
    if (contributorIds.length > 0) {
      const contributorTotals = new Map<string, number>();
      
      const { data: allContribs } = await supabase
        .from("pixel_contributions")
        .select("user_id, amount_pe")
        .in("user_id", contributorIds);
      
      (allContribs || []).forEach(c => {
        const current = contributorTotals.get(c.user_id) || 0;
        contributorTotals.set(c.user_id, current + c.amount_pe);
      });

      const { data: contributorUsers } = await supabase
        .from("users")
        .select("id, pe_total_pe")
        .in("id", contributorIds);

      const underCollateralizedContributors = new Set<string>();
      (contributorUsers || []).forEach(u => {
        const contribTotal = contributorTotals.get(u.id) || 0;
        if (u.pe_total_pe < contribTotal) {
          underCollateralizedContributors.add(u.id);
        }
      });

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
      return new Response(JSON.stringify({ ok: false, error: "STATE_CHANGED", message: "Pixel state changed, please re-validate" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Apply changes based on mode
    let affectedPixels = 0;
    const now = new Date().toISOString();

    if (mode === "ERASE") {
      // ERASE: Delete owned pixels and their contributions
      // PE is automatically "refunded" since it's no longer locked
      for (const pixel of pixelStates) {
        if (!pixel.id || pixel.owner_user_id !== userId) continue;
        
        // 1. Delete all contributions on this pixel (DEF and ATK)
        // Contributors get their PE back (unlocked)
        await supabase
          .from("pixel_contributions")
          .delete()
          .eq("pixel_id", pixel.id);
        
        // 2. Delete the pixel itself
        // Owner gets their owner_stake_pe back (unlocked)
        const { error } = await supabase
          .from("pixels")
          .delete()
          .eq("id", pixel.id)
          .eq("owner_user_id", userId);
        
        if (!error) affectedPixels++;
      }
    } else if (mode === "REINFORCE") {
      for (const pixel of pixelStates) {
        if (!pixel.id || pixel.owner_user_id !== userId) continue;
        const { error } = await supabase
          .from("pixels")
          .update({ 
            owner_stake_pe: (pixel.owner_stake_pe || 0) + pePerPixel!,
            updated_at: now
          })
          .eq("id", pixel.id)
          .eq("owner_user_id", userId);
        
        if (!error) affectedPixels++;
      }
    } else if (mode === "DEFEND" || mode === "ATTACK") {
      const side = mode === "DEFEND" ? "DEF" : "ATK";
      
      for (const pixel of pixelStates) {
        if (!pixel.id) continue;
        
        const { data: existing } = await supabase
          .from("pixel_contributions")
          .select("id, amount_pe")
          .eq("pixel_id", pixel.id)
          .eq("user_id", userId)
          .eq("side", side)
          .single();

        if (existing) {
          const { error } = await supabase
            .from("pixel_contributions")
            .update({ amount_pe: existing.amount_pe + pePerPixel! })
            .eq("id", existing.id);
          if (!error) affectedPixels++;
        } else {
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

        // Notify pixel owner about defend/attack (only if not the owner themselves)
        if (pixel.owner_user_id && pixel.owner_user_id !== userId) {
          const notificationType = mode === "DEFEND" ? "PIXEL_DEFENDED" : "PIXEL_ATTACKED";
          const notificationTitle = mode === "DEFEND" 
            ? "Your pixel was defended!" 
            : "Your pixel is under attack!";
          const notificationBody = mode === "DEFEND"
            ? `Someone added ${pePerPixel} PE defense to (${pixel.x}, ${pixel.y})`
            : `Someone added ${pePerPixel} PE attack to (${pixel.x}, ${pixel.y})`;

          await supabase.from("notifications").insert({
            user_id: pixel.owner_user_id,
            type: notificationType,
            title: notificationTitle,
            body: notificationBody,
            meta: { 
              pixel_x: pixel.x, 
              pixel_y: pixel.y, 
              actor_id: userId, 
              amount: pePerPixel,
              side 
            }
          });
        }
      }
    } else if (mode === "PAINT") {
      for (const pixel of pixelStates) {
        const isEmpty = !pixel.id;
        const isOwnedByUser = pixel.owner_user_id === userId;

        if (isEmpty) {
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
          const { error } = await supabase
            .from("pixels")
            .update({ color: color!, updated_at: now })
            .eq("id", pixel.id);
          if (!error) affectedPixels++;
        } else {
          const threshold = calculateThreshold(pixel);

          // Delete DEF contributions
          if (pixel.id) {
            await supabase
              .from("pixel_contributions")
              .delete()
              .eq("pixel_id", pixel.id)
              .eq("side", "DEF");
          }

          // Convert ATK to DEF
          if (pixel.id) {
            await supabase
              .from("pixel_contributions")
              .update({ side: "DEF" })
              .eq("pixel_id", pixel.id)
              .eq("side", "ATK");
          }

          // Update pixel with new owner
          const previousOwnerId = pixel.owner_user_id;
          const { error } = await supabase
            .from("pixels")
            .update({
              owner_user_id: userId,
              owner_stake_pe: threshold,
              color: color!,
              updated_at: now
            })
            .eq("id", pixel.id);
          
          if (!error) {
            affectedPixels++;
            // Notify previous owner about takeover
            if (previousOwnerId && previousOwnerId !== userId) {
              await supabase.from("notifications").insert({
                user_id: previousOwnerId,
                type: "PIXEL_TAKEOVER",
                title: "Your pixel was taken!",
                body: `Someone painted over your pixel at (${pixel.x}, ${pixel.y})`,
                meta: { pixel_x: pixel.x, pixel_y: pixel.y, actor_id: userId, color }
              });
            }
          }
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
      for (const pixel of pixelStates) {
        const isEmpty = !pixel.id;
        const isOwnedByUser = pixel.owner_user_id === userId;
        
        if (isEmpty || isOwnedByUser) {
          xpEarned += 1;
        } else {
          xpEarned += 2;
        }
      }
    } else if (mode === "DEFEND" || mode === "ATTACK") {
      xpEarned = Math.floor(affectedPixels / 10);
    }
    // REINFORCE and ERASE give no XP
    
    if (xpEarned > 0) {
      const { data: userData } = await supabase
        .from("users")
        .select("xp")
        .eq("id", userId)
        .single();
      
      const currentXp = userData?.xp || 0;
      const newXp = currentXp + xpEarned;
      const newLevel = 1 + Math.floor(Math.sqrt(newXp / 50));
      
      await supabase
        .from("users")
        .update({ xp: newXp, level: newLevel })
        .eq("id", userId);
    }

    // Log paint event
    const { data: eventData } = await supabase
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

    // Calculate updated PE status
    const { data: updatedPixelStakes } = await supabase
      .from("pixels")
      .select("owner_stake_pe")
      .eq("owner_user_id", userId);

    const updatedPixelStakeTotal = (updatedPixelStakes || []).reduce(
      (sum, p) => sum + Number(p.owner_stake_pe || 0),
      0
    );

    const { data: updatedContribs } = await supabase
      .from("pixel_contributions")
      .select("amount_pe")
      .eq("user_id", userId);

    const updatedContribTotal = (updatedContribs || []).reduce(
      (sum, c) => sum + Number(c.amount_pe || 0),
      0
    );

    const peUsed = updatedPixelStakeTotal + updatedContribTotal;
    const peAvailable = Math.max(0, user.pe_total_pe - peUsed);

    console.log("[game-commit] Success:", { mode, affectedPixels, xpEarned, peUsed, peAvailable });

    return new Response(JSON.stringify({
      ok: true,
      affectedPixels,
      xpEarned,
      eventId: eventData?.id,
      contributionsPurged,
      purgedContributionCount,
      peStatus: {
        total: user.pe_total_pe,
        used: peUsed,
        available: peAvailable,
        pixelStakeTotal: updatedPixelStakeTotal,
        contributionTotal: updatedContribTotal,
      },
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
