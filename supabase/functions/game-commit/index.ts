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

type GameMode = "PAINT" | "DEFEND" | "ATTACK" | "REINFORCE" | "ERASE" | "WITHDRAW_DEF" | "WITHDRAW_ATK" | "WITHDRAW_REINFORCE" | "PING";

// Paint-specific limits
const MAX_PAINT_PIXELS = 300;
const PAINT_COOLDOWN_SECONDS = 30;

// Streaming batch sizes
const STREAM_BATCH_SIZE = 50;
const MIN_PIXELS_FOR_STREAMING = 50;

interface CommitRequest {
  mode: GameMode;
  pixels: { x: number; y: number; color?: string }[];
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

// Fetch pixels using RPC to bypass PostgREST URL length limits
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
  
  const BATCH_SIZE = 900;
  const coords = pixels.map(p => ({ x: p.x, y: p.y }));
  
  // Launch all batch RPCs in parallel for speed
  const batchPromises: any[] = [];
  for (let i = 0; i < coords.length; i += BATCH_SIZE) {
    const batch = coords.slice(i, i + BATCH_SIZE);
    batchPromises.push(supabase.rpc('fetch_pixels_by_coords', { coords: batch }));
  }
  const batchResults = await Promise.all(batchPromises);
  const allData: any[] = [];
  for (const { data, error } of batchResults) {
    if (error) {
      console.error('[game-commit] fetchPixelsByCoords error:', error);
      throw error;
    }
    if (data) allData.push(...data);
  }
  
  console.log(`[game-commit] fetchPixelsByCoords: ${Date.now() - t0}ms, input: ${pixels.length}, found: ${allData.length}`);
  return allData;
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

// PROMPT 55: Changed pixel structure for immediate UI update
interface ChangedPixel {
  x: number;
  y: number;
  color: string;
  owner_user_id: string;
  owner_stake_pe: number;
  def_total: number;
  atk_total: number;
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
  requestedColorMap?: Map<string, string>,
  onProgress?: (processed: number, total: number) => void,
  isVirtualPe?: boolean
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
  // PROMPT 55: Return changed pixels for immediate UI update
  changedPixels?: ChangedPixel[];
}> {
  const total = pixels.length;
  let affectedPixels = 0;
  const now = new Date().toISOString();
  
  // PROMPT 55: Track upserted pixels for changedPixels response
  let upsertedPixels: ChangedPixel[] | undefined = undefined;

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
      await supabase
        .from("pixels")
        .delete()
        .in("id", ownedPixelIds)
        .eq("owner_user_id", userId);
      
      affectedPixels = ownedPixelIds.length;
    }
  } else if (mode === "REINFORCE") {
    // OPTIMIZED: Parallel batch updates for REINFORCE
    const ownedPixels = pixelStates.filter(p => p.id && p.owner_user_id === userId);
    
    const REINFORCE_BATCH = 100;
    const MAX_PARALLEL = 5;
    const reinforceBatches: typeof ownedPixels[] = [];
    for (let i = 0; i < ownedPixels.length; i += REINFORCE_BATCH) {
      reinforceBatches.push(ownedPixels.slice(i, i + REINFORCE_BATCH));
    }
    
    console.log(`[game-commit] REINFORCE: ${ownedPixels.length} pixels in ${reinforceBatches.length} batches (parallel=${MAX_PARALLEL})`);
    
    for (let i = 0; i < reinforceBatches.length; i += MAX_PARALLEL) {
      const parallelGroup = reinforceBatches.slice(i, i + MAX_PARALLEL);
      const results = await Promise.all(
        parallelGroup.map(async (batch) => {
          let count = 0;
          // Use individual updates within each batch but run batches in parallel
          for (const pixel of batch) {
            const { error } = await supabase
              .from("pixels")
              .update({
                owner_stake_pe: (pixel.owner_stake_pe || 0) + pePerPixel!,
                updated_at: now
              })
              .eq("id", pixel.id)
              .eq("owner_user_id", userId);
            if (!error) count++;
          }
          return count;
        })
      );
      affectedPixels += results.reduce((a, b) => a + b, 0);
      
      // Send SSE progress after each parallel group
      if (onProgress) {
        const batchesDone = Math.min(i + MAX_PARALLEL, reinforceBatches.length);
        const pixelsDone = Math.min(batchesDone * REINFORCE_BATCH, ownedPixels.length);
        onProgress(pixelsDone, ownedPixels.length);
      }
    }
  } else if (mode === "DEFEND" || mode === "ATTACK") {
    const side = mode === "DEFEND" ? "DEF" : "ATK";
    const pixelsToProcess = pixelStates.filter(p => p.id);
    
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
    
    const toUpdate: Array<{ id: number; newAmount: number }> = [];
    const toInsert: Array<{ pixel_id: number; user_id: string; side: string; amount_pe: number }> = [];
    
    for (const pixel of pixelsToProcess) {
      const existing = existingMap.get(pixel.id!);
      if (existing) {
        toUpdate.push({ id: existing.id, newAmount: existing.amount_pe + pePerPixel! });
      } else {
        toInsert.push({ pixel_id: pixel.id!, user_id: userId, side, amount_pe: pePerPixel! });
      }
    }
    
    for (const u of toUpdate) {
      const { error } = await supabase
        .from("pixel_contributions")
        .update({ amount_pe: u.newAmount })
        .eq("id", u.id);
      if (!error) affectedPixels++;
    }
    
    if (toInsert.length > 0) {
      const { data: inserted } = await supabase
        .from("pixel_contributions")
        .insert(toInsert)
        .select("id");
      affectedPixels += inserted?.length || 0;
    }
    
    // DEFEND: Clear expires_at on pixels with virtual stake (save them from expiry)
    if (mode === "DEFEND") {
      const pixelIdsWithExpiry = pixelsToProcess
        .filter(p => p.id)
        .map(p => p.id!);
      
      if (pixelIdsWithExpiry.length > 0) {
        // Only update pixels that actually have expires_at set
        await supabase
          .from("pixels")
          .update({ expires_at: null })
          .in("id", pixelIdsWithExpiry)
          .not("expires_at", "is", null);
      }
    }
    
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
  } else if (mode === "WITHDRAW_DEF" || mode === "WITHDRAW_ATK") {
    // Withdraw contributions: reduce or delete pixel_contributions rows
    const side = mode === "WITHDRAW_DEF" ? "DEF" : "ATK";
    const pixelsToProcess = pixelStates.filter(p => p.id);
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
    
    for (const pixel of pixelsToProcess) {
      const existing = existingMap.get(pixel.id!);
      if (!existing) continue;
      
      const newAmount = existing.amount_pe - pePerPixel!;
      if (newAmount <= 0) {
        // Delete the contribution entirely
        const { error } = await supabase
          .from("pixel_contributions")
          .delete()
          .eq("id", existing.id);
        if (!error) affectedPixels++;
      } else {
        // Reduce the contribution
        const { error } = await supabase
          .from("pixel_contributions")
          .update({ amount_pe: newAmount })
          .eq("id", existing.id);
        if (!error) affectedPixels++;
      }
    }
  } else if (mode === "WITHDRAW_REINFORCE") {
    // Withdraw stake: reduce owner_stake_pe (min 1 PE remaining)
    const ownedPixels = pixelStates.filter(p => p.id && p.owner_user_id === userId);
    
    const REINFORCE_BATCH = 100;
    const MAX_PARALLEL = 5;
    const batches: typeof ownedPixels[] = [];
    for (let i = 0; i < ownedPixels.length; i += REINFORCE_BATCH) {
      batches.push(ownedPixels.slice(i, i + REINFORCE_BATCH));
    }
    
    for (let i = 0; i < batches.length; i += MAX_PARALLEL) {
      const parallelGroup = batches.slice(i, i + MAX_PARALLEL);
      const results = await Promise.all(
        parallelGroup.map(async (batch) => {
          let count = 0;
          for (const pixel of batch) {
            const currentStake = pixel.owner_stake_pe || 0;
            const newStake = Math.max(1, currentStake - pePerPixel!);
            if (newStake === currentStake) continue; // No change
            const { error } = await supabase
              .from("pixels")
              .update({ owner_stake_pe: newStake, updated_at: now })
              .eq("id", pixel.id)
              .eq("owner_user_id", userId);
            if (!error) count++;
          }
          return count;
        })
      );
      affectedPixels += results.reduce((a, b) => a + b, 0);
      
      if (onProgress) {
        const batchesDone = Math.min(i + MAX_PARALLEL, batches.length);
        const pixelsDone = Math.min(batchesDone * REINFORCE_BATCH, ownedPixels.length);
        onProgress(pixelsDone, ownedPixels.length);
      }
    }
  } else if (mode === "PAINT") {
    // PROMPT 54+56: Batch UPSERT for all PAINT pixels with chunking for large operations
    
    // Determine expiry for virtual PE users (Google auth)
    const expiresAt = isVirtualPe ? new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString() : null;
    
    // Build upsert data with calculated thresholds
    // Note: pixel_id, tile_x and tile_y are GENERATED columns, do not include them
    const upsertData: Array<{
      x: number;
      y: number;
      color: string;
      owner_user_id: string;
      owner_stake_pe: number;
      updated_at: string;
      expires_at: string | null;
      is_virtual_stake: boolean;
      virtual_pe_cost: number;
    }> = [];
    
    const takeoverPreviousOwners: Array<{ ownerId: string; x: number; y: number }> = [];
    const takeoverPixelIds: number[] = [];
    let totalVirtualPeCost = 0;
    
    for (const pixel of pixelStates) {
      const isEmpty = !pixel.id;
      const isOwnedByUser = pixel.owner_user_id === userId;
      
      let stake = 1;
      let virtualCost = 0;
      
      if (!isEmpty && !isOwnedByUser) {
        // Takeover: calculate threshold
        stake = calculateThreshold(pixel);
        virtualCost = stake;
        if (pixel.id) takeoverPixelIds.push(pixel.id);
        if (pixel.owner_user_id) {
          takeoverPreviousOwners.push({ ownerId: pixel.owner_user_id, x: pixel.x, y: pixel.y });
        }
      } else if (!isEmpty && isOwnedByUser) {
        // Color change only: keep existing stake
        stake = pixel.owner_stake_pe || 1;
        virtualCost = 0; // No additional cost for color change
      } else {
        // Empty pixel
        virtualCost = 1; // 1 PE for empty pixel
      }
      
      // For virtual PE: owner_stake_pe = 0, track cost separately
      const actualStake = isVirtualPe ? 0 : stake;
      if (isVirtualPe && !(!isEmpty && isOwnedByUser)) {
        totalVirtualPeCost += virtualCost;
      }
      
      // Use per-pixel requested color from requestedColorMap, fallback to top-level color
      const pixelKey = `${pixel.x}:${pixel.y}`;
      const pixelColor = requestedColorMap?.get(pixelKey) ?? color!;
      
      upsertData.push({
        x: pixel.x,
        y: pixel.y,
        color: pixelColor,
        owner_user_id: userId,
        owner_stake_pe: actualStake,
        updated_at: now,
        expires_at: isVirtualPe ? expiresAt : null,
        is_virtual_stake: isVirtualPe || false,
        virtual_pe_cost: isVirtualPe ? virtualCost : 0,
      });
    }

    onProgress?.(Math.floor(total * 0.4), total);

    // Handle DEF/ATK contribution cleanup for takeovers BEFORE upsert
    if (takeoverPixelIds.length > 0) {
      // Track PE involved in takeover for leaderboard history
      const { data: takeoverContribs } = await supabase
        .from("pixel_contributions")
        .select("user_id, amount_pe, side")
        .in("pixel_id", takeoverPixelIds);
      
      if (takeoverContribs && takeoverContribs.length > 0) {
        const defTotals = new Map<string, number>();
        const atkTotals = new Map<string, number>();
        for (const c of takeoverContribs) {
          if (c.side === "DEF") {
            defTotals.set(c.user_id, (defTotals.get(c.user_id) || 0) + c.amount_pe);
          } else if (c.side === "ATK") {
            atkTotals.set(c.user_id, (atkTotals.get(c.user_id) || 0) + c.amount_pe);
          }
        }
        // Increment historical takeover counters
        const updatePromises: Promise<unknown>[] = [];
        for (const [uid, amount] of defTotals) {
          updatePromises.push(
            supabase.rpc("increment_takeover_pe", { target_user_id: uid, def_amount: amount, atk_amount: 0 })
              .then(({ error }: { error: unknown }) => { if (error) console.error("[game-commit] takeover def increment error:", error); })
          );
        }
        for (const [uid, amount] of atkTotals) {
          updatePromises.push(
            supabase.rpc("increment_takeover_pe", { target_user_id: uid, def_amount: 0, atk_amount: amount })
              .then(({ error }: { error: unknown }) => { if (error) console.error("[game-commit] takeover atk increment error:", error); })
          );
        }
        await Promise.all(updatePromises);
        console.log(`[game-commit] Takeover PE tracked: ${defTotals.size} defenders, ${atkTotals.size} attackers`);
      }
      
      // Batch: Delete DEF contributions
      await supabase.from("pixel_contributions").delete()
        .in("pixel_id", takeoverPixelIds).eq("side", "DEF");
      // Batch: Flip ATK → DEF
      await supabase.from("pixel_contributions").update({ side: "DEF" })
        .in("pixel_id", takeoverPixelIds).eq("side", "ATK");
    }

    onProgress?.(Math.floor(total * 0.5), total);

    // PROMPT 59: Optimized batch upsert - increased batch size and parallelism
    const UPSERT_BATCH_SIZE = 100;  // Was 50
    const MAX_PARALLEL_BATCHES = 5;  // Was 3
    const allUpsertedPixels: Array<{ x: number; y: number; color: string; owner_user_id: string; owner_stake_pe: number; def_total: number; atk_total: number }> = [];
    
    console.log(`[game-commit] PAINT: upserting ${upsertData.length} pixels (batch=${UPSERT_BATCH_SIZE}, parallel=${MAX_PARALLEL_BATCHES})`);
    const upsertStart = Date.now();
    
    // Split into batches
    const batches: typeof upsertData[] = [];
    for (let i = 0; i < upsertData.length; i += UPSERT_BATCH_SIZE) {
      batches.push(upsertData.slice(i, i + UPSERT_BATCH_SIZE));
    }
    const totalBatches = batches.length;
    
    // Process batches in parallel groups
    for (let i = 0; i < batches.length; i += MAX_PARALLEL_BATCHES) {
      const parallelBatches = batches.slice(i, i + MAX_PARALLEL_BATCHES);
      const batchStartNum = i + 1;
      
      // Execute parallel batches
      // PROMPT 59: Skip .select() to save ~50% DB time per batch - reconstruct from input
      const batchResults = await Promise.all(
        parallelBatches.map(async (batch, idx) => {
          const batchNum = batchStartNum + idx;
          const { error: batchError } = await supabase
            .from("pixels")
            .upsert(batch, { 
              onConflict: 'x,y',
              ignoreDuplicates: false 
            });
            // Removed .select() - reconstruct changedPixels from input data

          if (batchError) {
            console.error(`[game-commit] PAINT batch ${batchNum}/${totalBatches} error:`, batchError);
            throw batchError;
          }
          
          console.log(`[game-commit] PAINT batch ${batchNum}/${totalBatches} completed: ${batch.length} pixels`);
          
          // Reconstruct result from input data (we know exactly what was upserted)
          return batch.map(p => ({
            x: p.x,
            y: p.y,
            color: p.color,
            owner_user_id: p.owner_user_id,
            owner_stake_pe: p.owner_stake_pe,
            def_total: 0,  // Reset to 0 for newly painted/taken pixels
            atk_total: 0,
          }));
        })
      );
      
      // Collect results
      for (const batchUpserted of batchResults) {
        allUpsertedPixels.push(...batchUpserted);
      }
      
      // Report progress
      const processedSoFar = Math.min(i + MAX_PARALLEL_BATCHES, batches.length);
      const progressRatio = 0.5 + 0.3 * (processedSoFar / batches.length);
      onProgress?.(Math.floor(total * progressRatio), total);
    }
    
    console.log(`[game-commit] PAINT: all ${totalBatches} batches completed in ${Date.now() - upsertStart}ms`);

    affectedPixels = allUpsertedPixels.length;
    
    // PROMPT 55: Store upserted pixels for changedPixels response
    if (allUpsertedPixels.length > 0) {
      upsertedPixels = allUpsertedPixels;
    }

    onProgress?.(Math.floor(total * 0.7), total);

    // Send takeover notifications in batch
    if (takeoverPreviousOwners.length > 0) {
      const notifications = takeoverPreviousOwners.map(t => ({
        user_id: t.ownerId,
        type: "PIXEL_TAKEOVER",
        title: "Your pixel was taken!",
        body: `Someone painted over your pixel at (${t.x}, ${t.y})`,
        meta: { pixel_x: t.x, pixel_y: t.y, actor_id: userId, color }
      }));
      await supabase.from("notifications").insert(notifications);
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
  let newPixelsPaintedTotal = user.pixels_painted_total || 0;
  let paintCooldownUntil: Date | null = null;
  
  if (mode === "PAINT" && affectedPixels > 0) {
    newPixelsPaintedTotal = (user.pixels_painted_total || 0) + affectedPixels;
    paintCooldownUntil = new Date(Date.now() + PAINT_COOLDOWN_SECONDS * 1000);
    
    const userUpdate: Record<string, unknown> = {
      pixels_painted_total: newPixelsPaintedTotal, 
      paint_cooldown_until: paintCooldownUntil.toISOString(),
    };
    
    // For virtual PE: manually increment virtual_pe_used (DB triggers won't handle stake=0)
    if (isVirtualPe && totalVirtualPeCost > 0) {
      userUpdate.virtual_pe_used = (Number(user.virtual_pe_used) || 0) + totalVirtualPeCost;
    }
    
    await supabase
      .from("users")
      .update(userUpdate)
      .eq("id", userId);
  }

  // Decrement pixels_painted_total on ERASE to prevent leaderboard inflation
  if (mode === "ERASE" && affectedPixels > 0) {
    newPixelsPaintedTotal = Math.max(0, (user.pixels_painted_total || 0) - affectedPixels);
    await supabase
      .from("users")
      .update({ pixels_painted_total: newPixelsPaintedTotal })
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

  // Read PE status - use virtual PE for Google users
  let peTotal: number, peUsed: number, peAvailable: number;
  
  if (isVirtualPe) {
    const { data: updatedUser } = await supabase
      .from("users")
      .select("virtual_pe_total, virtual_pe_used")
      .eq("id", userId)
      .single();
    peTotal = Number(updatedUser?.virtual_pe_total || user.virtual_pe_total || 0);
    peUsed = Number(updatedUser?.virtual_pe_used || 0);
    peAvailable = Math.max(0, peTotal - peUsed);
  } else {
    const { data: updatedUser } = await supabase
      .from("users")
      .select("pe_total_pe, pe_used_pe")
      .eq("id", userId)
      .single();
    peTotal = Number(updatedUser?.pe_total_pe || user.pe_total_pe || 0);
    peUsed = Number(updatedUser?.pe_used_pe || 0);
    peAvailable = Math.max(0, peTotal - peUsed);
  }

  onProgress?.(total, total);

  return {
    ok: true,
    affectedPixels,
    pixelsPaintedTotal: newPixelsPaintedTotal,
    eventId: eventData?.id,
    contributionsPurged: false,
    purgedContributionCount: 0,
    peStatus: {
      total: peTotal,
      used: peUsed,
      available: peAvailable,
    },
    ...(isVirtualPe ? { isVirtualPe: true } : {}),
    ...(mode === "PAINT" && paintCooldownUntil ? {
      paintCooldownUntil: paintCooldownUntil.toISOString(),
      paintCooldownSeconds: PAINT_COOLDOWN_SECONDS,
    } : {}),
    // PROMPT 55: Include changed pixels for immediate cache update
    ...(mode === "PAINT" && upsertedPixels ? { changedPixels: upsertedPixels } : {}),
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

        // Fetch pixels using RPC (bypasses URL length limits)
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
        // Determine if user paints with Virtual PE (VPE) for streaming path
        const isVirtualPeStream = user.auth_provider === 'google' || 
          (user.auth_provider === 'both' && !user.wallet_address);

        const result = await executeCommit(
          supabase,
          userId,
          mode,
          pixels,
          color,
          pePerPixel,
          pixelStates,
          user,
          undefined,
          (processed, t) => emit({ type: "progress", phase: "commit", processed, total: t }),
          isVirtualPeStream
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
    const t0 = Date.now();

    const authMs = Date.now() - t0;
    
    // OPTIMIZATION: Create Supabase client ONCE at the start (shared for PING and all operations)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: CommitRequest = await req.json();

    // === PING MODE: Full warmup including DB connection pool ===
    if (body.mode === "PING") {
      // Warm up database connection pool with lightweight query (reuses client above)
      const dbStart = Date.now();
      await supabase.from("users").select("id").limit(1);
      const dbMs = Date.now() - dbStart;
      
      console.log(`[game-commit] PING from ${userId} - warmed (auth=${authMs}ms, db=${dbMs}ms)`);
      return new Response(JSON.stringify({ 
        ok: true, 
        warm: true, 
        ts: Date.now(),
        authMs,
        dbMs
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
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
      .select("id, pe_total_pe, pixels_painted_total, level, paint_cooldown_until, auth_provider, wallet_address, virtual_pe_total, virtual_pe_used")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      return new Response(JSON.stringify({ ok: false, error: "USER_NOT_FOUND" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine if user paints with Virtual PE (VPE)
    const isVirtualPe = user.auth_provider === 'google' || 
      (user.auth_provider === 'both' && !user.wallet_address);

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

    // PROMPT 53: Use streaming ONLY for legacy modes (not PAINT)
    // PAINT mode always uses simple JSON for reliability
    if (stream && mode !== "PAINT" && pixels.length >= MIN_PIXELS_FOR_STREAMING) {
      return handleStreamingCommit(corsHeaders, supabase, userId, mode, pixels, color, pePerPixel, snapshotHash, user);
    }

    // Standard non-streaming response
    // Fetch current pixel states using RPC (bypasses URL length limits)
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

    // Build requestedColorMap from raw pixels (preserves per-pixel colors sent by frontend)
    const requestedColorMap = new Map<string, string>();
    (pixels as Array<{ x: number; y: number; color?: string }>).forEach(p => {
      if (p.color) requestedColorMap.set(`${p.x}:${p.y}`, p.color);
    });

    // Execute commit
    const result = await executeCommit(
      supabase,
      userId,
      mode,
      pixels,
      color,
      pePerPixel,
      pixelStates,
      user,
      requestedColorMap,
      undefined,
      isVirtualPe
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
