import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Allowed origins for CORS
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

type GameMode = "PAINT" | "DEFEND" | "ATTACK" | "REINFORCE" | "ERASE" | "PING";

// Paint-specific limits
const MAX_PAINT_PIXELS = 300;

// Streaming thresholds
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

// Fetch pixels using RPC with JSONB - much faster than .or() for 300+ pixels
// The .or() approach was causing 47+ second delays due to client-side string parsing
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
  
  const startTime = Date.now();
  console.log(`[game-validate] fetchPixelsByCoords: starting for ${pixels.length} pixels via RPC`);
  
  // Use the existing RPC function fetch_pixels_by_coords with JSONB
  // This bypasses the client-side .or() string building which is O(n²) slow
  const BATCH_SIZE = 900;
  const coords = pixels.map(p => ({ 
    x: Math.floor(p.x), 
    y: Math.floor(p.y) 
  }));
  
  const allData: any[] = [];
  for (let i = 0; i < coords.length; i += BATCH_SIZE) {
    const batch = coords.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase.rpc("fetch_pixels_by_coords", { 
      coords: batch 
    });
    if (error) {
      console.error('[game-validate] fetchPixelsByCoords RPC error:', error);
      throw error;
    }
    if (data) allData.push(...data);
  }
  
  // Convert RPC response to expected format (pixel_id is bigint in DB)
  const result = allData.map((p: { id: number; x: number; y: number; pixel_id: bigint; owner_user_id: string | null; owner_stake_pe: number; color: string; def_total: number; atk_total: number }) => ({
    id: p.id,
    x: Number(p.x),
    y: Number(p.y),
    pixel_id: String(p.pixel_id),
    owner_user_id: p.owner_user_id,
    owner_stake_pe: p.owner_stake_pe,
    color: p.color,
    def_total: p.def_total,
    atk_total: p.atk_total,
  }));
  
  console.log(`[game-validate] fetchPixelsByCoords: found ${result.length} in ${Date.now() - startTime}ms`);
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

// =====================================================
// PAINT FAST-PATH: Optimized validation for PAINT mode
// Zero global scans, minimal queries, read-only
// =====================================================

interface PaintFastPathResult {
  ok: boolean;
  error?: string;
  message?: string;
  requiredPeTotal: number;
  snapshotHash: string;
  invalidPixels: InvalidPixel[];
  breakdown: {
    pixelCount: number;
    ownedByUser: number;
    ownedByOthers: number;
    empty: number;
    floorBasedCount: number;
    pePerType: { [key: string]: number };
  };
  availablePe: number;
  requestId: string;
  timings: {
    authMs: number;
    fetchUserMs: number;
    fetchPixelsMs: number;
    fetchOwnersMs: number;
    computeMs: number;
    totalMs: number;
  };
}

async function handlePaintFastPath(
  corsHeaders: Record<string, string>,
  // deno-lint-ignore no-explicit-any
  supabase: any,
  userId: string,
  pixels: Array<{ x: number; y: number }>,
  color: string,
  stream: boolean,
  requestId: string,
  t0: number,
  authMs: number
): Promise<Response> {
  const encoder = new TextEncoder();
  
  // Helper for streaming
  const createStreamResponse = (streamFn: (emit: (data: object) => void, close: () => void) => Promise<void>) => {
    const readableStream = new ReadableStream({
      async start(controller) {
        const emit = (data: object) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };
        const close = () => controller.close();
        await streamFn(emit, close);
      }
    });
    
    return new Response(readableStream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  };
  
  // Core validation logic (shared between streaming and non-streaming)
  const executeValidation = async (emit?: (data: object) => void): Promise<PaintFastPathResult> => {
    const total = pixels.length;
    
    // OPTIMIZATION: Parallel fetch of user and pixels to reduce total time
    // This saves ~10-15 seconds by not waiting for user fetch before pixel fetch
    emit?.({ type: "progress", phase: "loading", pct: 5, requestId });
    
    const tParallelStart = Date.now();
    
    // Launch both queries in parallel
    const userPromise = supabase
      .from("users")
      .select("id, pe_total_pe, pe_used_pe, paint_cooldown_until")
      .eq("id", userId)
      .single();
    
    const pixelsPromise = fetchPixelsByCoords(supabase, pixels);
    
    // Wait for both to complete
    const [userResult, existingPixels] = await Promise.all([
      userPromise,
      pixelsPromise
    ]);
    
    const tParallelEnd = Date.now();
    const fetchUserMs = tParallelEnd - tParallelStart;
    const fetchPixelsMs = tParallelEnd - tParallelStart; // Both ran in parallel
    
    const { data: user, error: userError } = userResult;
    
    if (userError || !user) {
      throw { httpStatus: 404, error: "USER_NOT_FOUND", message: "User not found" };
    }
    
    console.log(`[game-validate] Parallel fetch completed in ${tParallelEnd - tParallelStart}ms (user+pixels)`);
    
    // Step C: Cooldown check IMMEDIATELY (before any heavy processing)
    if (user.paint_cooldown_until) {
      const cooldownUntil = new Date(user.paint_cooldown_until);
      const now = new Date();
      if (now < cooldownUntil) {
        const retryAfterSeconds = Math.ceil((cooldownUntil.getTime() - now.getTime()) / 1000);
        throw { 
          httpStatus: 429, 
          error: "PAINT_COOLDOWN", 
          message: `Paint cooldown active. Wait ${retryAfterSeconds}s`,
          cooldownUntil: cooldownUntil.toISOString(),
          retryAfterSeconds 
        };
      }
    }
    
    emit?.({ type: "progress", phase: "processing", pct: 40, requestId });
    
    // Build pixel map for quick lookup using x:y key
    const pixelMap = new Map<string, typeof existingPixels[0]>();
    existingPixels.forEach(p => {
      const key = `${p.x}:${p.y}`;
      pixelMap.set(key, p);
    });
    
    // Step E: Fetch owner data ONLY for owners in rebalance (1 query, deduplicated)
    emit?.({ type: "progress", phase: "owners", pct: 50, requestId });
    
    const tFetchOwners = Date.now();
    const ownerIds = [...new Set(
      existingPixels
        .map(p => p.owner_user_id)
        .filter((id): id is string => id !== null && id !== userId) // Exclude user's own pixels
    )];
    
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
    const fetchOwnersMs = Date.now() - tFetchOwners;
    
    // Step F: Calculate PE availability from counters (NO GLOBAL SCAN)
    const peTotal = Number(user.pe_total_pe) || 0;
    const peUsed = Number(user.pe_used_pe) || 0;
    const peAvailable = peTotal - peUsed;
    
    // Step G: Compute required PE for each pixel
    emit?.({ type: "progress", phase: "compute", pct: 80, requestId });
    
    const tCompute = Date.now();
    const invalidPixels: InvalidPixel[] = [];
    let requiredPeTotal = 0;
    let ownedByUser = 0;
    let ownedByOthers = 0;
    let emptyCount = 0;
    let floorBasedCount = 0;
    const breakdown: { [key: string]: number } = {};
    const pixelStates: PixelData[] = [];
    
    for (const p of pixels) {
      const key = `${p.x}:${p.y}`;
      const existing = pixelMap.get(key);
      const ownerData = existing?.owner_user_id ? ownerDataMap.get(existing.owner_user_id) : undefined;
      
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
        ownerData,
      };
      
      pixelStates.push(pixel);
      
      const isEmpty = !pixel.id;
      const isOwnedByUser = pixel.owner_user_id === userId;
      
      if (isEmpty) {
        emptyCount++;
        requiredPeTotal += 1;
        breakdown["empty"] = (breakdown["empty"] || 0) + 1;
      } else if (isOwnedByUser) {
        ownedByUser++;
        // Color change only - no PE cost
        breakdown["colorChange"] = (breakdown["colorChange"] || 0) + 1;
      } else {
        ownedByOthers++;
        const { threshold, isFloorBased } = calculateThreshold(pixel);
        requiredPeTotal += threshold;
        breakdown["takeover"] = (breakdown["takeover"] || 0) + 1;
        breakdown[`threshold_${pixel.x}_${pixel.y}`] = threshold;
        if (isFloorBased) floorBasedCount++;
      }
    }
    const computeMs = Date.now() - tCompute;
    
    // Generate snapshot hash
    const snapshotHash = generateSnapshotHash(pixelStates);
    
    const totalMs = Date.now() - t0;
    const timings = {
      authMs,
      fetchUserMs,
      fetchPixelsMs,
      fetchOwnersMs,
      computeMs,
      totalMs,
    };
    
    // Check PE availability
    if (requiredPeTotal > peAvailable) {
      return {
        ok: false,
        error: "INSUFFICIENT_PE",
        message: `Need ${requiredPeTotal} PE but only ${peAvailable} available`,
        requiredPeTotal,
        snapshotHash,
        invalidPixels: [],
        breakdown: {
          pixelCount: total,
          ownedByUser,
          ownedByOthers,
          empty: emptyCount,
          floorBasedCount,
          pePerType: breakdown,
        },
        availablePe: peAvailable,
        requestId,
        timings,
      };
    }
    
    return {
      ok: true,
      requiredPeTotal,
      snapshotHash,
      invalidPixels,
      breakdown: {
        pixelCount: total,
        ownedByUser,
        ownedByOthers,
        empty: emptyCount,
        floorBasedCount,
        pePerType: breakdown,
      },
      availablePe: peAvailable,
      requestId,
      timings,
    };
  };
  
  // PROMPT 53: PAINT mode ALWAYS uses JSON response (no SSE streaming)
  // Streaming was removed for PAINT to improve reliability and simplicity
  // The 'stream' parameter is ignored for PAINT - always returns JSON
  
  // Non-streaming response
  try {
    const result = await executeValidation();
    console.log(`[game-validate] PAINT fast-path completed in ${result.timings.totalMs}ms`, result.timings);
    
    return new Response(JSON.stringify(result), {
      status: result.ok ? 200 : 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    // deno-lint-ignore no-explicit-any
    const e = err as any;
    console.error("[game-validate] PAINT fast-path error:", e);
    return new Response(JSON.stringify({
      ok: false,
      error: e.error || "INTERNAL_ERROR",
      message: e.message || String(err),
      requestId,
      ...(e.cooldownUntil && { cooldownUntil: e.cooldownUntil }),
      ...(e.retryAfterSeconds && { retryAfterSeconds: e.retryAfterSeconds }),
    }), {
      status: e.httpStatus || 500,
      headers: { 
        ...corsHeaders, 
        "Content-Type": "application/json",
        ...(e.retryAfterSeconds && { "Retry-After": String(e.retryAfterSeconds) }),
      },
    });
  }
}

// =====================================================
// LEGACY PATH: For DEFEND, ATTACK, REINFORCE, ERASE
// =====================================================

// deno-lint-ignore no-explicit-any
async function handleLegacyValidate(
  corsHeaders: Record<string, string>,
  // deno-lint-ignore no-explicit-any
  supabase: any,
  userId: string,
  mode: GameMode,
  pixels: Array<{ x: number; y: number }>,
  pePerPixel: number | undefined,
  // deno-lint-ignore no-explicit-any
  user: any,
  stream: boolean
): Promise<Response> {
  const encoder = new TextEncoder();
  const total = pixels.length;

  // Streaming handler for legacy modes
  if (stream && pixels.length >= MIN_PIXELS_FOR_STREAMING) {
    const readableStream = new ReadableStream({
      async start(controller) {
        const emit = (data: object) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          emit({ type: "progress", phase: "validate", processed: 0, total });

          // Fetch pixels using coordinates (avoids bigint precision issues)
          const existingPixels = await fetchPixelsByCoords(supabase, pixels);
          emit({ type: "progress", phase: "validate", processed: Math.floor(total * 0.3), total });

          const pixelMap = new Map<string, typeof existingPixels[0]>();
          existingPixels.forEach((p: typeof existingPixels[0]) => {
            const key = `${p.x}:${p.y}`;
            pixelMap.set(key, p);
          });

          // Fetch owner data
          const ownerIds = [...new Set(existingPixels.map((p: typeof existingPixels[0]) => p.owner_user_id).filter(Boolean))] as string[];
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

          // Fetch user contribution sides for DEFEND/ATTACK
          const userContribSides = new Map<number, "DEF" | "ATK">();
          if (mode === "DEFEND" || mode === "ATTACK") {
            const pixelIds = existingPixels.map((p: typeof existingPixels[0]) => p.id).filter(Boolean);
            if (pixelIds.length > 0) {
              const { data: contribs } = await supabase
                .from("pixel_contributions")
                .select("pixel_id, side")
                .in("pixel_id", pixelIds)
                .eq("user_id", userId);
              
              (contribs || []).forEach((c: { pixel_id: number; side: string }) => {
                userContribSides.set(c.pixel_id, c.side as "DEF" | "ATK");
              });
            }
          }

          emit({ type: "progress", phase: "validate", processed: Math.floor(total * 0.5), total });

          // Use pe_used_pe from user record (no global scan)
          const peTotal = Number(user.pe_total_pe) || 0;
          const peUsed = Number(user.pe_used_pe) || 0;
          const peFree = peTotal - peUsed;

          // Build enriched pixel data and validate
          const invalidPixels: InvalidPixel[] = [];
          let requiredPeTotal = 0;
          let ownedByUser = 0;
          let ownedByOthers = 0;
          let emptyCount = 0;
          let validPixelCount = 0;
          const breakdown: { [key: string]: number } = {};
          const pixelStates: PixelData[] = [];

          for (const p of pixels) {
            const key = `${p.x}:${p.y}`;
            const existing = pixelMap.get(key);
            const ownerData = existing?.owner_user_id ? ownerDataMap.get(existing.owner_user_id) : undefined;
            const userSide = existing ? userContribSides.get(existing.id) : undefined;
            
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
            }
          }

          emit({ type: "progress", phase: "validate", processed: Math.floor(total * 0.9), total });

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
              pePerType: breakdown,
            },
            availablePe: peFree,
            unlockPeTotal,
          };

          emit({ type: "done", result });
          controller.close();

        } catch (err) {
          console.error("[game-validate] Legacy streaming error:", err);
          emit({ type: "error", error: "INTERNAL_ERROR", message: String(err) });
          controller.close();
        }
      }
    });

    return new Response(readableStream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  }

  // Non-streaming legacy path: use coordinates for reliable lookup
  const existingPixels = await fetchPixelsByCoords(supabase, pixels);
  
  const pixelMap = new Map<string, typeof existingPixels[0]>();
  existingPixels.forEach((p: typeof existingPixels[0]) => {
    const key = `${p.x}:${p.y}`;
    pixelMap.set(key, p);
  });

  // Fetch owner data
  const ownerIds = [...new Set(existingPixels.map((p: typeof existingPixels[0]) => p.owner_user_id).filter(Boolean))] as string[];
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

  // Fetch user contribution sides for DEFEND/ATTACK
  const userContribSides = new Map<number, "DEF" | "ATK">();
  if (mode === "DEFEND" || mode === "ATTACK") {
    const pixelIds = existingPixels.map((p: typeof existingPixels[0]) => p.id).filter(Boolean);
    if (pixelIds.length > 0) {
      const { data: contribs } = await supabase
        .from("pixel_contributions")
        .select("pixel_id, side")
        .in("pixel_id", pixelIds)
        .eq("user_id", userId);
      
      (contribs || []).forEach((c: { pixel_id: number; side: string }) => {
        userContribSides.set(c.pixel_id, c.side as "DEF" | "ATK");
      });
    }
  }

  // Use pe_used_pe from user record (no global scan)
  const peTotal = Number(user.pe_total_pe) || 0;
  const peUsed = Number(user.pe_used_pe) || 0;
  const peFree = peTotal - peUsed;

  // Build enriched pixel data
  const pixelStates: PixelData[] = pixels.map(p => {
    const key = `${p.x}:${p.y}`;
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
  let validPixelCount = 0;
  const breakdown: { [key: string]: number } = {};

  for (const pixel of pixelStates) {
    const isEmpty = !pixel.id;
    const isOwnedByUser = pixel.owner_user_id === userId;

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
      pePerType: breakdown,
    },
    availablePe: peFree,
    unlockPeTotal,
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// =====================================================
// MAIN ENTRY POINT
// =====================================================

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  const t0 = Date.now();
  const requestId = crypto.randomUUID();
  
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Health check endpoint for warm-up - respond immediately
  const url = new URL(req.url);
  if (url.pathname.endsWith('/health') || url.searchParams.has('health')) {
    return new Response(JSON.stringify({ ok: true, ts: Date.now() }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // === AUTH ===
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
    const authMs = Date.now() - t0;

    // OPTIMIZATION: Create Supabase client ONCE at the start (shared for PING and all operations)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: ValidateRequest = await req.json();

    // === PING MODE: Full warmup including DB connection pool ===
    if (body.mode === "PING") {
      // Warm up database connection pool with lightweight query (reuses client above)
      const dbStart = Date.now();
      await supabase.from("users").select("id").limit(1);
      const dbMs = Date.now() - dbStart;
      
      console.log(`[game-validate] PING from ${userId} - warmed (auth=${authMs}ms, db=${dbMs}ms)`);
      return new Response(JSON.stringify({ 
        ok: true, 
        warm: true, 
        ts: Date.now(),
        authMs,
        dbMs,
        requestId 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { mode, pixels: rawPixels, color, pePerPixel, stream = false } = body;

    // Deduplicate pixels
    const pixelSet = new Set<string>();
    const pixels = (rawPixels || []).filter((p: { x: number; y: number }) => {
      const key = `${p.x}:${p.y}`;
      if (pixelSet.has(key)) return false;
      pixelSet.add(key);
      return true;
    });

    console.log(`[game-validate] Request ${requestId}: mode=${mode}, pixels=${pixels.length}, stream=${stream}`);

    // === INPUT VALIDATION ===
    if (!mode || !pixels || !Array.isArray(pixels) || pixels.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: "INVALID_INPUT", message: "Missing required fields", requestId }), {
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
        message: `Too many requests. Retry in ${rateCheck.retryAfter}s`,
        requestId 
      }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(rateCheck.retryAfter) },
      });
    }

    const maxPixels = mode === "PAINT" ? MAX_PAINT_PIXELS : 10000;
    if (pixels.length > maxPixels) {
      return new Response(JSON.stringify({ ok: false, error: "TOO_MANY_PIXELS", message: `Max ${maxPixels} pixels per request`, requestId }), {
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
        requestId,
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["PAINT", "DEFEND", "ATTACK", "REINFORCE", "ERASE"].includes(mode)) {
      return new Response(JSON.stringify({ ok: false, error: "INVALID_MODE", requestId }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mode-specific validation
    if (mode === "PAINT") {
      if (!color || !isValidPaintId(color)) {
        return new Response(JSON.stringify({ ok: false, error: "INVALID_COLOR", message: "PAINT requires valid hex color or material ID", requestId }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      // === PAINT FAST-PATH ===
      return handlePaintFastPath(corsHeaders, supabase, userId, pixels, color, stream, requestId, t0, authMs);
    }
    
    // === LEGACY PATH for DEFEND, ATTACK, REINFORCE, ERASE ===
    if (mode !== "ERASE") {
      if (!pePerPixel || pePerPixel < 1 || !Number.isInteger(pePerPixel)) {
        return new Response(JSON.stringify({ ok: false, error: "INVALID_PE", message: `${mode} requires positive integer pePerPixel`, requestId }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fetch user data for legacy modes (with pe_used_pe)
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, pe_total_pe, pe_used_pe, paint_cooldown_until")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      return new Response(JSON.stringify({ ok: false, error: "USER_NOT_FOUND", requestId }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return handleLegacyValidate(corsHeaders, supabase, userId, mode, pixels, pePerPixel, user, stream);

  } catch (err) {
    console.error(`[game-validate] Error (${requestId}):`, err);
    return new Response(JSON.stringify({ ok: false, error: "INTERNAL_ERROR", message: String(err), requestId }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
