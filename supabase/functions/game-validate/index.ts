import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type GameMode = "PAINT" | "DEFEND" | "ATTACK" | "REINFORCE";

interface ValidateRequest {
  userId: string;
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
}

// Generate a hash from pixel states for optimistic locking
function generateSnapshotHash(pixelStates: PixelData[]): string {
  const data = pixelStates.map(p => `${p.x}:${p.y}:${p.id || 0}:${p.owner_user_id || ''}:${p.owner_stake_pe || 0}:${p.defSum}:${p.atkSum}`).join("|");
  // Simple hash function
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: ValidateRequest = await req.json();
    const { userId, mode, pixels, color, pePerPixel } = body;

    console.log("[game-validate] Request:", { userId, mode, pixelCount: pixels?.length, color, pePerPixel });

    // Input validation
    if (!userId || !mode || !pixels || !Array.isArray(pixels) || pixels.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: "INVALID_INPUT", message: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
    const pixelCoords = pixels.map(p => `(${p.x},${p.y})`);
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
    const peStaked = ownedStakeSum + contributionsSum;
    const peFree = user.pe_total_pe - peStaked;

    console.log("[game-validate] PE status:", { total: user.pe_total_pe, staked: peStaked, free: peFree });

    // Build enriched pixel data
    const pixelStates: PixelData[] = pixels.map(p => {
      const existing = pixelMap.get(`${p.x}:${p.y}`);
      const contribs = existing ? contribsByPixel.get(existing.id) : undefined;
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
      };
    });

    // Validate each pixel and compute required PE
    const invalidPixels: InvalidPixel[] = [];
    let requiredPeTotal = 0;
    let ownedByUser = 0;
    let ownedByOthers = 0;
    let emptyCount = 0;
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
          // Takeover - calculate threshold
          const vNow = (pixel.owner_stake_pe || 0) + pixel.defSum - pixel.atkSum;
          const vClamped = Math.max(0, vNow);
          const threshold = vClamped + 1;
          requiredPeTotal += threshold;
          breakdown["takeover"] = (breakdown["takeover"] || 0) + 1;
          breakdown[`threshold_${pixel.x}_${pixel.y}`] = threshold;
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
        pePerType: breakdown,
      },
      availablePe: peFree,
    };

    console.log("[game-validate] Result:", { ok: result.ok, requiredPeTotal, invalidCount: invalidPixels.length });

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
