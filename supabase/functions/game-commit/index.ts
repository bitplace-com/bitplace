import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type GameMode = "PAINT" | "DEFEND" | "ATTACK" | "REINFORCE";

interface CommitRequest {
  userId: string;
  mode: GameMode;
  pixels: { x: number; y: number }[];
  color?: string;
  pePerPixel?: number;
  snapshotHash: string;
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
}

function generateSnapshotHash(pixelStates: PixelData[]): string {
  const data = pixelStates.map(p => `${p.x}:${p.y}:${p.id || 0}:${p.owner_user_id || ''}:${p.owner_stake_pe || 0}:${p.defSum}:${p.atkSum}`).join("|");
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

    const body: CommitRequest = await req.json();
    const { userId, mode, pixels, color, pePerPixel, snapshotHash } = body;

    console.log("[game-commit] Request:", { userId, mode, pixelCount: pixels?.length, snapshotHash });

    // Input validation
    if (!userId || !mode || !pixels || !Array.isArray(pixels) || pixels.length === 0 || !snapshotHash) {
      return new Response(JSON.stringify({ ok: false, error: "INVALID_INPUT" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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

    // Fetch contributions
    const pixelIds = (existingPixels || []).map(p => p.id);
    let contributions: { pixel_id: number; user_id: string; side: string; amount_pe: number }[] = [];
    
    if (pixelIds.length > 0) {
      const { data: contribs } = await supabase
        .from("pixel_contributions")
        .select("pixel_id, user_id, side, amount_pe")
        .in("pixel_id", pixelIds);
      contributions = contribs || [];
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
      return {
        x: p.x,
        y: p.y,
        id: existing?.id,
        owner_user_id: existing?.owner_user_id,
        owner_stake_pe: existing?.owner_stake_pe || 0,
        color: existing?.color,
        defSum: contribs?.defSum || 0,
        atkSum: contribs?.atkSum || 0,
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
          // Takeover
          const vNow = (pixel.owner_stake_pe || 0) + pixel.defSum - pixel.atkSum;
          const vClamped = Math.max(0, vNow);
          const threshold = vClamped + 1;

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

    // Log paint event
    const { data: eventData, error: eventError } = await supabase
      .from("paint_events")
      .insert({
        user_id: userId,
        action_type: mode,
        pixel_count: affectedPixels,
        bbox,
        details: { color, pePerPixel },
        created_at: now
      })
      .select("id")
      .single();

    if (eventError) {
      console.error("[game-commit] Event log error:", eventError);
    }

    console.log("[game-commit] Success:", { affectedPixels, eventId: eventData?.id });

    return new Response(JSON.stringify({
      ok: true,
      affectedPixels,
      eventId: eventData?.id
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
