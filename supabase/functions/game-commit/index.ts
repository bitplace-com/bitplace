import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Allowed origins for CORS
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

// Paint-specific limits
const MAX_PAINT_PIXELS = 500;
const PAINT_COOLDOWN_SECONDS = 30;

// Streaming batch sizes
const STREAM_BATCH_SIZE = 50;
const MIN_PIXELS_FOR_STREAMING = 50;

interface CommitRequest {
  mode: GameMode;
  pixels: { x: number; y: number }[];
  color?: string;
  pePerPixel?: number;
  snapshotHash: string;
  stream?: boolean;
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
  pixel_id?: bigint;
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

// Compute pixel_id from (x, y) - matches DB column: (x << 32) | y
function computePixelId(x: number, y: number): bigint {
  return (BigInt(x) << 32n) | BigInt(y & 0xFFFFFFFF);
}

// OPTIMIZED: Fetch pixels using RPC with (x,y) coordinates - avoids BigInt precision issues
// deno-lint-ignore no-explicit-any
async function fetchPixelsByCoords(
  supabase: any,
  pixels: Array<{ x: number; y: number }>
): Promise<Array<{ 
  id: number; 
  x: number; 
  y: number; 
  pixel_id: string;
  owner_user_id: string | null; 
  owner_stake_pe: number | null; 
  color: string | null;
  def_total: number;
  atk_total: number;
}>> {
  if (pixels.length === 0) return [];
  
  const t0 = Date.now();
  
  // Use RPC function with JSON coordinates - bypasses BigInt issues
  const coords = pixels.map(p => ({ x: p.x, y: p.y }));
  const { data, error } = await supabase.rpc('fetch_pixels_by_coords', { coords });
  
  console.log(`[game-commit] fetchPixelsByCoords: ${Date.now() - t0}ms, input: ${pixels.length}, found: ${data?.length || 0}`);
  
  if (error) {
    console.error('[game-commit] RPC fetch_pixels_by_coords error:', error);
    throw error;
  }
  return data || [];
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

const LEVEL_BASE = 10;
const MAX_LEVEL = 100;

function calculateLevel(pixelsPainted: number): number {
  return Math.min(MAX_LEVEL, Math.floor(Math.sqrt(pixelsPainted / LEVEL_BASE)) + 1);
}

const VALID_MATERIALS = [
  'mat:gold', 'mat:silver', 'mat:bronze',
  'mat:holo_rainbow', 'mat:prism',
  'mat:ice', 'mat:fire', 'mat:lava',
  'mat:aurora', 'mat:nebula', 'mat:pearl', 'mat:carbon'
];

function isValidPaintId(paintId: string): boolean {
  if (/^#[0-9A-Fa-f]{6}$/i.test(paintId)) return true;
  return VALID_MATERIALS.includes(paintId);
}

// Core commit logic - shared between streaming and non-streaming
async function executeCommit(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  userId: string,
  mode: GameMode,
  pixels: Array<{ x: number; y: number }>,
  color: string | undefined,
  pePerPixel: number | undefined,
  pixelStates: PixelData[],
  // deno-lint-ignore no-explicit-any
  user: any,
  onProgress?: (processed: number, total: number) => void
): Promise<{
  ok: boolean;
  affectedPixels: number;
  pixelsPaintedTotal: number;
  level: number;
  // deno-lint-ignore no-explicit-any
  eventId?: any;
  contributionsPurged: boolean;
  purgedContributionCount: number;
  // deno-lint-ignore no-explicit-any
  peStatus: any;
  paintCooldownUntil?: string;
  paintCooldownSeconds?: number;
}> {
  const total = pixels.length;
  let affectedPixels = 0;
  const now = new Date().toISOString();

  onProgress?.(Math.floor(total * 0.3), total);

  if (mode === "ERASE") {
    // OPTIMIZED: Batch delete for ERASE
    const ownedPixelIds = pixelStates
      .filter(p => p.id && p.owner_user_id === userId)
      .map(p => p.id!);
    
    if (ownedPixelIds.length > 0) {
      // Batch delete contributions
      await supabase
        .from("pixel_contributions")
        .delete()
        .in("pixel_id", ownedPixelIds);
      
      // Batch delete pixels
      const { data: deletedPixels } = await supabase
        .from("pixels")
        .delete()
        .in("id", ownedPixelIds)
        .eq("owner_user_id", userId)
        .select("id");
      
      affectedPixels = deletedPixels?.length || 0;
    }
  } else if (mode === "REINFORCE") {
    // OPTIMIZED: Batch update for REINFORCE
    const ownedPixels = pixelStates.filter(p => p.id && p.owner_user_id === userId);
    
    for (const pixel of ownedPixels) {
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
    const pixelsToProcess = pixelStates.filter(p => p.id);
    
    // Fetch existing contributions in batch
    const pixelIds = pixelsToProcess.map(p => p.id!);
    const { data: existingContribs } = await supabase
      .from("pixel_contributions")
      .select("id, pixel_id, amount_pe")
      .in("pixel_id", pixelIds)
      .eq("user_id", userId)
      .eq("side", side);
    
    const existingMap = new Map<number, { id: number; amount_pe: number }>();
    (existingContribs || []).forEach((c: { id: number; pixel_id: number; amount_pe: number }) => {
      existingMap.set(c.pixel_id, { id: c.id, amount_pe: c.amount_pe });
    });
    
    // Separate updates from inserts
    const toUpdate: Array<{ id: number; newAmount: number }> = [];
    const toInsert: Array<{ pixel_id: number; user_id: string; side: string; amount_pe: number }> = [];
    
    for (const pixel of pixelsToProcess) {
      const existing = existingMap.get(pixel.id!);
      if (existing) {
        toUpdate.push({ id: existing.id, newAmount: existing.amount_pe + pePerPixel! });
      } else {
        toInsert.push({
          pixel_id: pixel.id!,
          user_id: userId,
          side,
          amount_pe: pePerPixel!
        });
      }
    }
    
    // Batch update existing contributions
    for (const u of toUpdate) {
      const { error } = await supabase
        .from("pixel_contributions")
        .update({ amount_pe: u.newAmount })
        .eq("id", u.id);
      if (!error) affectedPixels++;
    }
    
    // Batch insert new contributions
    if (toInsert.length > 0) {
      const { data: inserted } = await supabase
        .from("pixel_contributions")
        .insert(toInsert)
        .select("id");
      affectedPixels += inserted?.length || 0;
    }
    
    // Batch notifications for owners
    const ownersToNotify = pixelsToProcess
      .filter(p => p.owner_user_id && p.owner_user_id !== userId)
      .map(p => ({
        user_id: p.owner_user_id!,
        type: mode === "DEFEND" ? "PIXEL_DEFENDED" : "PIXEL_ATTACKED",
        title: mode === "DEFEND" ? "Your pixel was defended!" : "Your pixel is under attack!",
        body: mode === "DEFEND"
          ? `Someone added ${pePerPixel} PE defense to (${p.x}, ${p.y})`
          : `Someone added ${pePerPixel} PE attack to (${p.x}, ${p.y})`,
        meta: { pixel_x: p.x, pixel_y: p.y, actor_id: userId, amount: pePerPixel, side }
      }));
    
    if (ownersToNotify.length > 0) {
      await supabase.from("notifications").insert(ownersToNotify);
    }
  } else if (mode === "PAINT") {
    // Categorize pixels
    const toInsert: Array<{ x: number; y: number; color: string; owner_user_id: string; owner_stake_pe: number; created_at: string; updated_at: string }> = [];
    const toUpdateOwned: Array<{ id: number }> = [];
    const toTakeover: PixelData[] = [];

    for (const pixel of pixelStates) {
      const isEmpty = !pixel.id;
      const isOwnedByUser = pixel.owner_user_id === userId;

      if (isEmpty) {
        toInsert.push({
          x: pixel.x,
          y: pixel.y,
          color: color!,
          owner_user_id: userId,
          owner_stake_pe: 1,
          created_at: now,
          updated_at: now
        });
      } else if (isOwnedByUser) {
        toUpdateOwned.push({ id: pixel.id! });
      } else {
        toTakeover.push(pixel);
      }
    }

    onProgress?.(Math.floor(total * 0.4), total);

    // OPTIMIZED: Single bulk insert for new pixels
    if (toInsert.length > 0) {
      const { data: insertedData, error: insertError } = await supabase
        .from("pixels")
        .insert(toInsert)
        .select("id");
      
      if (insertError) {
        console.error("[game-commit] Bulk insert error:", insertError);
      } else {
        affectedPixels += insertedData?.length || 0;
      }
    }

    onProgress?.(Math.floor(total * 0.5), total);

    // OPTIMIZED: Single bulk update for owned pixels
    if (toUpdateOwned.length > 0) {
      const ids = toUpdateOwned.map(p => p.id);
      const { error: updateError } = await supabase
        .from("pixels")
        .update({ color: color!, updated_at: now })
        .in("id", ids);
      
      if (!updateError) {
        affectedPixels += toUpdateOwned.length;
      }
    }

    onProgress?.(Math.floor(total * 0.6), total);

    // OPTIMIZED: Batch takeover processing
    if (toTakeover.length > 0) {
      const takeoverIds = toTakeover.filter(p => p.id).map(p => p.id!);
      
      // Batch delete DEF contributions
      if (takeoverIds.length > 0) {
        await supabase
          .from("pixel_contributions")
          .delete()
          .in("pixel_id", takeoverIds)
          .eq("side", "DEF");
        
        // Batch update ATK -> DEF
        await supabase
          .from("pixel_contributions")
          .update({ side: "DEF" })
          .in("pixel_id", takeoverIds)
          .eq("side", "ATK");
      }
      
      // Update pixels individually (different thresholds)
      const notifications: Array<{ user_id: string; type: string; title: string; body: string; meta: object }> = [];
      
      for (const pixel of toTakeover) {
        const threshold = calculateThreshold(pixel);
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
          if (previousOwnerId && previousOwnerId !== userId) {
            notifications.push({
              user_id: previousOwnerId,
              type: "PIXEL_TAKEOVER",
              title: "Your pixel was taken!",
              body: `Someone painted over your pixel at (${pixel.x}, ${pixel.y})`,
              meta: { pixel_x: pixel.x, pixel_y: pixel.y, actor_id: userId, color }
            });
          }
        }
      }
      
      // Batch insert takeover notifications
      if (notifications.length > 0) {
        await supabase.from("notifications").insert(notifications);
      }
    }
  }

  onProgress?.(Math.floor(total * 0.8), total);

  // Notify followers for PAINT
  if (mode === "PAINT" && affectedPixels > 0) {
    const { data: followers } = await supabase
      .from("user_follows")
      .select("follower_id")
      .eq("followed_id", userId);

    if (followers && followers.length > 0) {
      const followerNotifications = followers.map((f: { follower_id: string }) => ({
        user_id: f.follower_id,
        type: "FOLLOWED_PLAYER_PAINTED",
        title: "A player you follow painted!",
        body: `Painted ${affectedPixels} pixel${affectedPixels > 1 ? 's' : ''}`,
        meta: { actor_id: userId, pixel_count: affectedPixels, color }
      }));

      await supabase.from("notifications").insert(followerNotifications);
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

  // Update user stats for PAINT
  let newLevel = user.level || 1;
  let newPixelsPaintedTotal = user.pixels_painted_total || 0;
  let paintCooldownUntil: Date | null = null;
  
  if (mode === "PAINT" && affectedPixels > 0) {
    newPixelsPaintedTotal = (user.pixels_painted_total || 0) + affectedPixels;
    newLevel = calculateLevel(newPixelsPaintedTotal);
    paintCooldownUntil = new Date(Date.now() + PAINT_COOLDOWN_SECONDS * 1000);
    
    await supabase
      .from("users")
      .update({ 
        pixels_painted_total: newPixelsPaintedTotal, 
        level: newLevel,
        paint_cooldown_until: paintCooldownUntil.toISOString(),
      })
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
      details: { color, pePerPixel, pixelsPainted: newPixelsPaintedTotal },
      created_at: now
    })
    .select("id")
    .single();

  onProgress?.(Math.floor(total * 0.9), total);

  // Calculate updated PE status
  const { data: updatedPixelStakes } = await supabase
    .from("pixels")
    .select("owner_stake_pe")
    .eq("owner_user_id", userId);

  const updatedPixelStakeTotal = (updatedPixelStakes || []).reduce(
    (sum: number, p: { owner_stake_pe: number }) => sum + Number(p.owner_stake_pe || 0),
    0
  );

  const { data: updatedContribs } = await supabase
    .from("pixel_contributions")
    .select("amount_pe")
    .eq("user_id", userId);

  const updatedContribTotal = (updatedContribs || []).reduce(
    (sum: number, c: { amount_pe: number }) => sum + Number(c.amount_pe || 0),
    0
  );

  const peUsed = updatedPixelStakeTotal + updatedContribTotal;
  const peAvailable = Math.max(0, user.pe_total_pe - peUsed);

  onProgress?.(total, total);

  return {
    ok: true,
    affectedPixels,
    pixelsPaintedTotal: newPixelsPaintedTotal,
    level: newLevel,
    eventId: eventData?.id,
    contributionsPurged: false,
    purgedContributionCount: 0,
    peStatus: {
      total: user.pe_total_pe,
      used: peUsed,
      available: peAvailable,
      pixelStakeTotal: updatedPixelStakeTotal,
      contributionTotal: updatedContribTotal,
    },
    ...(mode === "PAINT" && paintCooldownUntil ? {
      paintCooldownUntil: paintCooldownUntil.toISOString(),
      paintCooldownSeconds: PAINT_COOLDOWN_SECONDS,
    } : {}),
  };
}

// SSE streaming commit handler
async function handleStreamingCommit(
  corsHeaders: Record<string, string>,
  // deno-lint-ignore no-explicit-any
  supabase: any,
  userId: string,
  mode: GameMode,
  pixels: Array<{ x: number; y: number }>,
  color: string | undefined,
  pePerPixel: number | undefined,
  snapshotHash: string,
  // deno-lint-ignore no-explicit-any
  user: any
): Promise<Response> {
  const encoder = new TextEncoder();
  const total = pixels.length;

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        emit({ type: "progress", phase: "commit", processed: 0, total });

        // Fetch pixels using RPC with (x,y) coordinates
        let existingPixels: Awaited<ReturnType<typeof fetchPixelsByCoords>> = [];
        try {
          existingPixels = await fetchPixelsByCoords(supabase, pixels);
        } catch (pixelsError) {
          console.error("[game-commit] Pixels fetch error:", pixelsError);
          emit({ type: "error", error: "DB_ERROR", message: "Failed to fetch pixels" });
          controller.close();
          return;
        }

        emit({ type: "progress", phase: "commit", processed: Math.floor(total * 0.1), total });

        const pixelMap = new Map<string, typeof existingPixels[0]>();
        existingPixels.forEach(p => {
          const key = computePixelId(Number(p.x), Number(p.y)).toString();
          pixelMap.set(key, p);
        });

        // Fetch owner data
        const ownerIds = [...new Set(existingPixels.map(p => p.owner_user_id).filter(Boolean))];
        const ownerDataMap = new Map<string, OwnerData>();
        
        if (ownerIds.length > 0) {
          const { data: owners } = await supabase
            .from("users")
            .select("id, owner_health_multiplier, rebalance_active, rebalance_started_at, rebalance_ends_at, rebalance_target_multiplier")
            .in("id", ownerIds);
          
          (owners || []).forEach((o: OwnerData) => {
            ownerDataMap.set(o.id, o);
          });
        }

        emit({ type: "progress", phase: "commit", processed: Math.floor(total * 0.15), total });

        // Build pixel states using def_total/atk_total
        const pixelStates: PixelData[] = pixels.map(p => {
          const key = computePixelId(p.x, p.y).toString();
          const existing = pixelMap.get(key);
          const ownerData = existing?.owner_user_id ? ownerDataMap.get(existing.owner_user_id) : undefined;
          return {
            x: p.x,
            y: p.y,
            id: existing?.id,
            pixel_id: existing ? BigInt(existing.pixel_id) : undefined,
            owner_user_id: existing?.owner_user_id ?? undefined,
            owner_stake_pe: existing?.owner_stake_pe || 0,
            color: existing?.color ?? undefined,
            defSum: existing?.def_total || 0,
            atkSum: existing?.atk_total || 0,
            ownerData,
          };
        });

        const currentHash = generateSnapshotHash(pixelStates);
        if (currentHash !== snapshotHash) {
          emit({ type: "error", error: "STATE_CHANGED", message: "Pixel state changed, please re-validate" });
          controller.close();
          return;
        }

        emit({ type: "progress", phase: "commit", processed: Math.floor(total * 0.2), total });

        // Execute commit with progress callback
        const result = await executeCommit(
          supabase,
          userId,
          mode,
          pixels,
          color,
          pePerPixel,
          pixelStates,
          user,
          (processed, t) => emit({ type: "progress", phase: "commit", processed, total: t })
        );

        emit({ type: "done", result });
        controller.close();

      } catch (err) {
        console.error("[game-commit] Streaming error:", err);
        emit({ type: "error", error: "INTERNAL_ERROR", message: String(err) });
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Health check endpoint for warm-up - respond immediately (before auth)
  const url = new URL(req.url);
  if (url.pathname.endsWith('/health') || url.searchParams.has('health')) {
    return new Response(JSON.stringify({ ok: true, ts: Date.now() }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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
    const { mode, pixels: rawPixels, color, pePerPixel, snapshotHash, stream = false } = body;

    // Deduplicate pixels
    const pixelSet = new Set<string>();
    const pixels = (rawPixels || []).filter((p: { x: number; y: number }) => {
      const key = `${p.x}:${p.y}`;
      if (pixelSet.has(key)) return false;
      pixelSet.add(key);
      return true;
    });

    console.log("[game-commit] Request:", { userId, mode, pixelCount: pixels.length, snapshotHash, stream });

    if (!mode || !pixels || !Array.isArray(pixels) || pixels.length === 0 || !snapshotHash) {
      return new Response(JSON.stringify({ ok: false, error: "INVALID_INPUT" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PAINT-specific limits
    if (mode === "PAINT" && pixels.length > MAX_PAINT_PIXELS) {
      return new Response(JSON.stringify({
        ok: false,
        error: "MAX_PIXELS_EXCEEDED",
        message: `Maximum ${MAX_PAINT_PIXELS} pixels per paint`,
        max: MAX_PAINT_PIXELS,
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate color for PAINT mode
    if (mode === "PAINT" && (!color || !isValidPaintId(color))) {
      return new Response(JSON.stringify({ ok: false, error: "INVALID_COLOR", message: "PAINT requires valid hex color or material ID" }), {
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

    // Fetch user data
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, pe_total_pe, pixels_painted_total, level, paint_cooldown_until")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      return new Response(JSON.stringify({ ok: false, error: "USER_NOT_FOUND" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Re-check PAINT cooldown
    if (mode === "PAINT" && user.paint_cooldown_until) {
      const cooldownUntil = new Date(user.paint_cooldown_until);
      const now = new Date();
      if (now < cooldownUntil) {
        const retryAfterSeconds = Math.ceil((cooldownUntil.getTime() - now.getTime()) / 1000);
        return new Response(JSON.stringify({
          ok: false,
          error: "PAINT_COOLDOWN",
          message: `Paint cooldown active. Wait ${retryAfterSeconds}s`,
          cooldownUntil: cooldownUntil.toISOString(),
          retryAfterSeconds,
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Use streaming for large operations
    if (stream && pixels.length >= MIN_PIXELS_FOR_STREAMING) {
      return handleStreamingCommit(corsHeaders, supabase, userId, mode, pixels, color, pePerPixel, snapshotHash, user);
    }

    // Standard non-streaming response
    // Fetch current pixel states using RPC
    let existingPixels: Awaited<ReturnType<typeof fetchPixelsByCoords>> = [];
    try {
      existingPixels = await fetchPixelsByCoords(supabase, pixels);
    } catch (pixelsError) {
      console.error("[game-commit] Pixels fetch error:", pixelsError);
      return new Response(JSON.stringify({ ok: false, error: "DB_ERROR", message: "Failed to fetch pixels" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pixelMap = new Map<string, typeof existingPixels[0]>();
    existingPixels.forEach(p => {
      const key = computePixelId(Number(p.x), Number(p.y)).toString();
      pixelMap.set(key, p);
    });

    // Fetch owner data
    const ownerIds = [...new Set(existingPixels.map(p => p.owner_user_id).filter(Boolean))];
    const ownerDataMap = new Map<string, OwnerData>();
    
    if (ownerIds.length > 0) {
      const { data: owners } = await supabase
        .from("users")
        .select("id, owner_health_multiplier, rebalance_active, rebalance_started_at, rebalance_ends_at, rebalance_target_multiplier")
        .in("id", ownerIds);
      
      (owners || []).forEach((o: OwnerData) => {
        ownerDataMap.set(o.id, o);
      });
    }

    // Check user's contributions for under-collateralization
    const { data: allUserContribs } = await supabase
      .from("pixel_contributions")
      .select("amount_pe")
      .eq("user_id", userId);

    const userContribTotal = (allUserContribs || []).reduce((sum: number, c: { amount_pe: number }) => sum + c.amount_pe, 0);

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

    // Build pixel states using def_total/atk_total
    const pixelStates: PixelData[] = pixels.map(p => {
      const key = computePixelId(p.x, p.y).toString();
      const existing = pixelMap.get(key);
      const ownerData = existing?.owner_user_id ? ownerDataMap.get(existing.owner_user_id) : undefined;
      return {
        x: p.x,
        y: p.y,
        id: existing?.id,
        pixel_id: existing ? BigInt(existing.pixel_id) : undefined,
        owner_user_id: existing?.owner_user_id ?? undefined,
        owner_stake_pe: existing?.owner_stake_pe || 0,
        color: existing?.color ?? undefined,
        defSum: existing?.def_total || 0,
        atkSum: existing?.atk_total || 0,
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

    // Execute commit
    const result = await executeCommit(
      supabase,
      userId,
      mode,
      pixels,
      color,
      pePerPixel,
      pixelStates,
      user
    );

    return new Response(JSON.stringify({
      ...result,
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
