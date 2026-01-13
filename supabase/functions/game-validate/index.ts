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

// Verify JWT token
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

// Streaming batch size
const STREAM_BATCH_SIZE = 50;
const MIN_PIXELS_FOR_STREAMING = 50;

interface ValidateRequest {
  mode: GameMode;
  pixels: { x: number; y: number }[];
  color?: string;
  pePerPixel?: number;
  stream?: boolean;
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
  pixel_id?: bigint;
  owner_user_id?: string | null;
  owner_stake_pe?: number;
  color?: string | null;
  defSum: number;
  atkSum: number;
  userContributionSide?: "DEF" | "ATK";
  ownerData?: OwnerData;
}

// Rate limiting
const rateLimits = new Map<string, { 
  validateCount: number; 
  validateWindowStart: number;
}>();

const VALIDATE_LIMIT = 5;
const VALIDATE_WINDOW_MS = 1000;

function checkValidateRateLimit(userId: string): { ok: boolean; retryAfter?: number } {
  const now = Date.now();
  let entry = rateLimits.get(userId);
  
  if (!entry) {
    entry = { validateCount: 0, validateWindowStart: now };
    rateLimits.set(userId, entry);
  }
  
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

// Compute pixel_id from (x, y) - matches DB column: (x << 32) | y
function computePixelId(x: number, y: number): bigint {
  return (BigInt(x) << 32n) | BigInt(y & 0xFFFFFFFF);
}

// Constants for rebalance calculations
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

function calculateThreshold(pixel: PixelData): { threshold: number; vFloor?: number; isFloorBased: boolean } {
  const ownerStake = pixel.owner_stake_pe || 0;
  const defSum = pixel.defSum;
  const atkSum = pixel.atkSum;
  const owner = pixel.ownerData;

  if (!owner || !owner.rebalance_active) {
    const vNow = ownerStake + defSum - atkSum;
    const vClamped = Math.max(0, vNow);
    return { threshold: vClamped + 1, isFloorBased: false };
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
    const vClamped = Math.max(0, vFloor);
    
    return { 
      threshold: vClamped + 1, 
      vFloor: vFloor,
      isFloorBased: true 
    };
  }

  const effectiveStake = ownerStake * owner.owner_health_multiplier;
  const vNow = effectiveStake + defSum - atkSum;
  const vClamped = Math.max(0, vNow);
  return { threshold: vClamped + 1, isFloorBased: true };
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
  
  console.log(`[game-validate] fetchPixelsByCoords: ${Date.now() - t0}ms, input: ${pixels.length}, found: ${data?.length || 0}`);
  
  if (error) {
    console.error('[game-validate] RPC fetch_pixels_by_coords error:', error);
    throw error;
  }
  return data || [];
}

// Fetch user contributions for checking existing side (needed for DEFEND/ATTACK mode)
// deno-lint-ignore no-explicit-any
async function fetchUserContributionsForPixels(
  supabase: any,
  pixelIds: number[],
  userId: string
): Promise<Map<number, "DEF" | "ATK">> {
  if (pixelIds.length === 0) return new Map();
  
  const { data, error } = await supabase
    .from("pixel_contributions")
    .select("pixel_id, side")
    .in("pixel_id", pixelIds)
    .eq("user_id", userId);
  
  if (error) {
    console.error("[game-validate] User contributions fetch error:", error);
    return new Map();
  }
  
  const result = new Map<number, "DEF" | "ATK">();
  (data || []).forEach((c: { pixel_id: number; side: string }) => {
    result.set(c.pixel_id, c.side as "DEF" | "ATK");
  });
  return result;
}

// Valid material IDs
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

// SSE streaming response handler
async function handleStreamingValidate(
  corsHeaders: Record<string, string>,
  // deno-lint-ignore no-explicit-any
  supabase: any,
  userId: string,
  mode: GameMode,
  pixels: Array<{ x: number; y: number }>,
  color: string | undefined,
  pePerPixel: number | undefined,
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
        emit({ type: "progress", phase: "validate", processed: 0, total });

        // Phase 1: Fetch pixels using RPC with (x,y) coordinates
        let existingPixels: Awaited<ReturnType<typeof fetchPixelsByCoords>> = [];
        try {
          existingPixels = await fetchPixelsByCoords(supabase, pixels);
          emit({ type: "progress", phase: "validate", processed: Math.floor(total * 0.3), total });
        } catch (pixelsError) {
          console.error("[game-validate] Pixels fetch error:", pixelsError);
          emit({ type: "error", error: "DB_ERROR", message: "Failed to fetch pixels" });
          controller.close();
          return;
        }

        // Build pixel map keyed by computed pixel_id
        const pixelMap = new Map<string, typeof existingPixels[0]>();
        existingPixels.forEach(p => {
          const key = computePixelId(Number(p.x), Number(p.y)).toString();
          pixelMap.set(key, p);
        });

        // Fetch owner data for all pixel owners
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

        emit({ type: "progress", phase: "validate", processed: Math.floor(total * 0.4), total });

        // For DEFEND/ATTACK: fetch user's existing contributions
        let userContribSides = new Map<number, "DEF" | "ATK">();
        if (mode === "DEFEND" || mode === "ATTACK") {
          const pixelIds = existingPixels.map(p => p.id);
          userContribSides = await fetchUserContributionsForPixels(supabase, pixelIds, userId);
        }

        emit({ type: "progress", phase: "validate", processed: Math.floor(total * 0.5), total });

        // Fetch user's staked PE
        const { data: userOwnedPixels } = await supabase
          .from("pixels")
          .select("owner_stake_pe")
          .eq("owner_user_id", userId);

        const { data: userContributions } = await supabase
          .from("pixel_contributions")
          .select("amount_pe")
          .eq("user_id", userId);

        const ownedStakeSum = (userOwnedPixels || []).reduce((sum: number, p: { owner_stake_pe: number }) => sum + (p.owner_stake_pe || 0), 0);
        const contributionsSum = (userContributions || []).reduce((sum: number, c: { amount_pe: number }) => sum + c.amount_pe, 0);

        // Check under-collateralized contributions
        let contributionsPurged = false;
        let purgedContributionCount = 0;
        
        if (contributionsSum > user.pe_total_pe) {
          const { data: deleted, error: delError } = await supabase
            .from("pixel_contributions")
            .delete()
            .eq("user_id", userId)
            .select("id");
          
          if (!delError) {
            purgedContributionCount = deleted?.length || 0;
            contributionsPurged = true;
            userContribSides.clear();
          }
        }

        const peStaked = ownedStakeSum + (contributionsPurged ? 0 : contributionsSum);
        const peFree = user.pe_total_pe - peStaked;

        emit({ type: "progress", phase: "validate", processed: Math.floor(total * 0.6), total });

        // Build enriched pixel data and validate
        const invalidPixels: InvalidPixel[] = [];
        let requiredPeTotal = 0;
        let ownedByUser = 0;
        let ownedByOthers = 0;
        let emptyCount = 0;
        let floorBasedCount = 0;
        let validPixelCount = 0;
        const breakdown: { [key: string]: number } = {};
        const pixelStates: PixelData[] = [];

        for (let i = 0; i < pixels.length; i += STREAM_BATCH_SIZE) {
          const batch = pixels.slice(i, i + STREAM_BATCH_SIZE);
          
          for (const p of batch) {
            const key = computePixelId(p.x, p.y).toString();
            const existing = pixelMap.get(key);
            const ownerData = existing?.owner_user_id ? ownerDataMap.get(existing.owner_user_id) : undefined;
            const userSide = existing ? userContribSides.get(existing.id) : undefined;
            
            // Use def_total and atk_total from pixels table directly
            const pixel: PixelData = {
              x: p.x,
              y: p.y,
              id: existing?.id,
              pixel_id: existing ? BigInt(existing.pixel_id) : undefined,
              owner_user_id: existing?.owner_user_id,
              owner_stake_pe: existing?.owner_stake_pe || 0,
              color: existing?.color,
              defSum: existing?.def_total || 0,
              atkSum: existing?.atk_total || 0,
              userContributionSide: userSide,
              ownerData,
            };
            
            pixelStates.push(pixel);

            const isEmpty = !pixel.id;
            const isOwnedByUser = pixel.owner_user_id === userId;
            const isOwnedByOthers = !isEmpty && !isOwnedByUser;

            if (isEmpty) emptyCount++;
            else if (isOwnedByUser) ownedByUser++;
            else ownedByOthers++;

            if (mode === "ERASE") {
              if (isEmpty) {
                invalidPixels.push({ x: pixel.x, y: pixel.y, reason: "EMPTY_PIXEL" });
                continue;
              }
              if (!isOwnedByUser) {
                invalidPixels.push({ x: pixel.x, y: pixel.y, reason: "NOT_OWNER" });
                continue;
              }
              validPixelCount++;
              breakdown["eraseRefund"] = (breakdown["eraseRefund"] || 0) + (pixel.owner_stake_pe || 0);
            } else if (mode === "REINFORCE") {
              if (isEmpty) {
                invalidPixels.push({ x: pixel.x, y: pixel.y, reason: "EMPTY_PIXEL" });
                continue;
              }
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
                breakdown["colorChange"] = (breakdown["colorChange"] || 0) + 1;
              } else {
                const { threshold, isFloorBased } = calculateThreshold(pixel);
                requiredPeTotal += threshold;
                breakdown["takeover"] = (breakdown["takeover"] || 0) + 1;
                breakdown[`threshold_${pixel.x}_${pixel.y}`] = threshold;
                if (isFloorBased) floorBasedCount++;
              }
            }
          }

          const processed = Math.min(i + STREAM_BATCH_SIZE, pixels.length);
          const progressPct = 0.6 + (processed / pixels.length) * 0.4;
          emit({ type: "progress", phase: "validate", processed: Math.floor(total * progressPct), total });
        }

        // Check PE availability
        if (mode !== "ERASE" && invalidPixels.length === 0 && requiredPeTotal > peFree) {
          emit({
            type: "done",
            result: {
              ok: false,
              error: "INSUFFICIENT_PE",
              message: `Need ${requiredPeTotal} PE but only ${peFree} available`,
              requiredPeTotal,
              availablePe: peFree,
              invalidPixels: [],
            }
          });
          controller.close();
          return;
        }

        const snapshotHash = generateSnapshotHash(pixelStates);
        const unlockPeTotal = mode === "ERASE" ? (breakdown["eraseRefund"] || 0) : undefined;
        const isErasePartialSuccess = mode === "ERASE" && validPixelCount > 0 && invalidPixels.length > 0;
        const eraseHasValidPixels = mode === "ERASE" && validPixelCount > 0;

        const result = {
          ok: mode === "ERASE" ? eraseHasValidPixels : invalidPixels.length === 0,
          partialValid: isErasePartialSuccess,
          validPixelCount: mode === "ERASE" ? validPixelCount : undefined,
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
          unlockPeTotal,
          contributionsPurged,
          purgedContributionCount,
        };

        emit({ type: "done", result });
        controller.close();

      } catch (err) {
        console.error("[game-validate] Streaming error:", err);
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

    const body: ValidateRequest = await req.json();
    const { mode, pixels: rawPixels, color, pePerPixel, stream = false } = body;

    // Deduplicate pixels
    const pixelSet = new Set<string>();
    const pixels = (rawPixels || []).filter((p: { x: number; y: number }) => {
      const key = `${p.x}:${p.y}`;
      if (pixelSet.has(key)) return false;
      pixelSet.add(key);
      return true;
    });

    console.log("[game-validate] Request:", { userId, mode, pixelCount: pixels.length, color, pePerPixel, stream });

    // Input validation
    if (!mode || !pixels || !Array.isArray(pixels) || pixels.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: "INVALID_INPUT", message: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limiting
    const rateCheck = checkValidateRateLimit(userId);
    if (!rateCheck.ok) {
      return new Response(JSON.stringify({ 
        ok: false, 
        error: "RATE_LIMITED", 
        message: `Too many requests. Retry in ${rateCheck.retryAfter}s` 
      }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(rateCheck.retryAfter) },
      });
    }

    if (pixels.length > 1000) {
      return new Response(JSON.stringify({ ok: false, error: "TOO_MANY_PIXELS", message: "Max 1000 pixels per request" }), {
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
        requested: pixels.length,
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["PAINT", "DEFEND", "ATTACK", "REINFORCE", "ERASE"].includes(mode)) {
      return new Response(JSON.stringify({ ok: false, error: "INVALID_MODE" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mode-specific validation
    if (mode === "PAINT") {
      if (!color || !isValidPaintId(color)) {
        return new Response(JSON.stringify({ ok: false, error: "INVALID_COLOR", message: "PAINT requires valid hex color or material ID" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (mode !== "ERASE") {
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
      .select("id, pe_total_pe, paint_cooldown_until")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      return new Response(JSON.stringify({ ok: false, error: "USER_NOT_FOUND" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check PAINT cooldown
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
          headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(retryAfterSeconds) },
        });
      }
    }

    // Use streaming for large operations
    if (stream && pixels.length >= MIN_PIXELS_FOR_STREAMING) {
      return handleStreamingValidate(corsHeaders, supabase, userId, mode, pixels, color, pePerPixel, user);
    }

    // Standard non-streaming response
    // Fetch pixels using RPC with (x,y) coordinates
    let existingPixels: Awaited<ReturnType<typeof fetchPixelsByCoords>> = [];
    try {
      existingPixels = await fetchPixelsByCoords(supabase, pixels);
    } catch (pixelsError) {
      console.error("[game-validate] Pixels fetch error:", pixelsError);
      return new Response(JSON.stringify({ ok: false, error: "DB_ERROR" }), {
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

    // For DEFEND/ATTACK: fetch user's existing contributions
    let userContribSides = new Map<number, "DEF" | "ATK">();
    if (mode === "DEFEND" || mode === "ATTACK") {
      const pixelIds = existingPixels.map(p => p.id);
      userContribSides = await fetchUserContributionsForPixels(supabase, pixelIds, userId);
    }

    // Fetch user's staked PE
    const { data: userOwnedPixels } = await supabase
      .from("pixels")
      .select("owner_stake_pe")
      .eq("owner_user_id", userId);

    const { data: userContributions } = await supabase
      .from("pixel_contributions")
      .select("amount_pe")
      .eq("user_id", userId);

    const ownedStakeSum = (userOwnedPixels || []).reduce((sum: number, p: { owner_stake_pe: number }) => sum + (p.owner_stake_pe || 0), 0);
    const contributionsSum = (userContributions || []).reduce((sum: number, c: { amount_pe: number }) => sum + c.amount_pe, 0);

    // Check under-collateralized contributions
    let contributionsPurged = false;
    let purgedContributionCount = 0;
    
    if (contributionsSum > user.pe_total_pe) {
      const { data: deleted, error: delError } = await supabase
        .from("pixel_contributions")
        .delete()
        .eq("user_id", userId)
        .select("id");
      
      if (!delError) {
        purgedContributionCount = deleted?.length || 0;
        contributionsPurged = true;
        userContribSides.clear();
      }
    }

    const peStaked = ownedStakeSum + (contributionsPurged ? 0 : contributionsSum);
    const peFree = user.pe_total_pe - peStaked;

    // Build enriched pixel data
    const pixelStates: PixelData[] = pixels.map(p => {
      const key = computePixelId(p.x, p.y).toString();
      const existing = pixelMap.get(key);
      const ownerData = existing?.owner_user_id ? ownerDataMap.get(existing.owner_user_id) : undefined;
      const userSide = existing ? userContribSides.get(existing.id) : undefined;
      
      return {
        x: p.x,
        y: p.y,
        id: existing?.id,
        pixel_id: existing ? BigInt(existing.pixel_id) : undefined,
        owner_user_id: existing?.owner_user_id,
        owner_stake_pe: existing?.owner_stake_pe || 0,
        color: existing?.color,
        defSum: existing?.def_total || 0,
        atkSum: existing?.atk_total || 0,
        userContributionSide: userSide,
        ownerData,
      };
    });

    // Validate each pixel
    const invalidPixels: InvalidPixel[] = [];
    let requiredPeTotal = 0;
    let ownedByUser = 0;
    let ownedByOthers = 0;
    let emptyCount = 0;
    let floorBasedCount = 0;
    let validPixelCount = 0;
    const breakdown: { [key: string]: number } = {};

    for (const pixel of pixelStates) {
      const isEmpty = !pixel.id;
      const isOwnedByUser = pixel.owner_user_id === userId;
      const isOwnedByOthers = !isEmpty && !isOwnedByUser;

      if (isEmpty) emptyCount++;
      else if (isOwnedByUser) ownedByUser++;
      else ownedByOthers++;

      if (mode === "ERASE") {
        if (isEmpty) {
          invalidPixels.push({ x: pixel.x, y: pixel.y, reason: "EMPTY_PIXEL" });
          continue;
        }
        if (!isOwnedByUser) {
          invalidPixels.push({ x: pixel.x, y: pixel.y, reason: "NOT_OWNER" });
          continue;
        }
        validPixelCount++;
        breakdown["eraseRefund"] = (breakdown["eraseRefund"] || 0) + (pixel.owner_stake_pe || 0);
      } else if (mode === "REINFORCE") {
        if (isEmpty) {
          invalidPixels.push({ x: pixel.x, y: pixel.y, reason: "EMPTY_PIXEL" });
          continue;
        }
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
          breakdown["colorChange"] = (breakdown["colorChange"] || 0) + 1;
        } else {
          const { threshold, isFloorBased } = calculateThreshold(pixel);
          requiredPeTotal += threshold;
          breakdown["takeover"] = (breakdown["takeover"] || 0) + 1;
          breakdown[`threshold_${pixel.x}_${pixel.y}`] = threshold;
          if (isFloorBased) floorBasedCount++;
        }
      }
    }

    // Check PE availability
    if (mode !== "ERASE" && invalidPixels.length === 0 && requiredPeTotal > peFree) {
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

    const snapshotHash = generateSnapshotHash(pixelStates);
    const unlockPeTotal = mode === "ERASE" ? (breakdown["eraseRefund"] || 0) : undefined;
    const isErasePartialSuccess = mode === "ERASE" && validPixelCount > 0 && invalidPixels.length > 0;
    const eraseHasValidPixels = mode === "ERASE" && validPixelCount > 0;

    return new Response(JSON.stringify({
      ok: mode === "ERASE" ? eraseHasValidPixels : invalidPixels.length === 0,
      partialValid: isErasePartialSuccess,
      validPixelCount: mode === "ERASE" ? validPixelCount : undefined,
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
      unlockPeTotal,
      contributionsPurged,
      purgedContributionCount,
    }), {
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
