import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WithdrawRequest {
  pixels: { x: number; y: number }[];
  action: "validate" | "commit";
  side?: "DEF" | "ATK";  // Optional: only withdraw specific side
}

async function verifyToken(token: string, secret: string) {
  const [headerB64, payloadB64, signatureB64] = token.split(".");
  if (!headerB64 || !payloadB64 || !signatureB64) return null;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const data = encoder.encode(`${headerB64}.${payloadB64}`);
  const sig = await crypto.subtle.sign("HMAC", key, data);
  const expectedSig = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  if (signatureB64 !== expectedSig) return null;

  const payload = JSON.parse(atob(payloadB64));
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;

  return { wallet: payload.wallet, userId: payload.userId };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.slice(7);
    const secret = Deno.env.get("AUTH_SECRET");
    if (!secret) {
      return new Response(JSON.stringify({ error: "Server config error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tokenData = await verifyToken(token, secret);
    if (!tokenData) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { userId } = tokenData;
    const { pixels, action, side }: WithdrawRequest = await req.json();

    if (!pixels || !Array.isArray(pixels) || pixels.length === 0) {
      return new Response(JSON.stringify({ error: "pixels array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action !== "validate" && action !== "commit") {
      return new Response(JSON.stringify({ error: "action must be 'validate' or 'commit'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get pixel IDs for the given coordinates
    const coordPairs = pixels.map(p => `(${p.x},${p.y})`);
    const { data: pixelRows, error: pixelError } = await supabase
      .from("pixels")
      .select("id, x, y")
      .or(pixels.map(p => `and(x.eq.${p.x},y.eq.${p.y})`).join(","));

    if (pixelError) {
      console.error("Error fetching pixels:", pixelError);
      return new Response(JSON.stringify({ error: "Failed to fetch pixels" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pixelIdMap = new Map<string, number>();
    pixelRows?.forEach(p => {
      pixelIdMap.set(`${p.x},${p.y}`, p.id);
    });

    // Get user's contributions on these pixels
    const pixelIds = Array.from(pixelIdMap.values());
    if (pixelIds.length === 0) {
      return new Response(JSON.stringify({
        ok: false,
        invalidPixels: pixels.map(p => ({ x: p.x, y: p.y, reason: "Pixel not found" })),
        totalRefund: 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build query for user's contributions on these pixels
    let contribQuery = supabase
      .from("pixel_contributions")
      .select("id, pixel_id, amount_pe, side")
      .eq("user_id", userId)
      .in("pixel_id", pixelIds);
    
    // Apply side filter if specified
    if (side) {
      contribQuery = contribQuery.eq("side", side);
    }

    const { data: contributions, error: contribError } = await contribQuery;

    if (contribError) {
      console.error("Error fetching contributions:", contribError);
      return new Response(JSON.stringify({ error: "Failed to fetch contributions" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Map contributions by pixel_id
    const contribByPixelId = new Map<number, { id: number; amount_pe: number; side: string }>();
    contributions?.forEach(c => {
      contribByPixelId.set(c.pixel_id, { id: c.id, amount_pe: Number(c.amount_pe), side: c.side });
    });

    // Validate each pixel
    const validPixels: { x: number; y: number; pixelId: number; contribId: number; amount: number; side: string }[] = [];
    const invalidPixels: { x: number; y: number; reason: string }[] = [];

    for (const p of pixels) {
      const key = `${p.x},${p.y}`;
      const pixelId = pixelIdMap.get(key);
      
      if (!pixelId) {
        invalidPixels.push({ x: p.x, y: p.y, reason: "Pixel not found" });
        continue;
      }

      const contrib = contribByPixelId.get(pixelId);
      if (!contrib || contrib.amount_pe <= 0) {
        invalidPixels.push({ x: p.x, y: p.y, reason: "No contribution on this pixel" });
        continue;
      }

      validPixels.push({
        x: p.x,
        y: p.y,
        pixelId,
        contribId: contrib.id,
        amount: contrib.amount_pe,
        side: contrib.side,
      });
    }

    const totalRefund = validPixels.reduce((sum, p) => sum + p.amount, 0);

    // Get current PE status using denormalized pe_used_pe (maintained by triggers)
    const { data: userData } = await supabase
      .from("users")
      .select("pe_total_pe, pe_used_pe")
      .eq("id", userId)
      .single();

    const peTotalPe = Number(userData?.pe_total_pe ?? 0);
    const peUsed = Number(userData?.pe_used_pe ?? 0);
    const peAvailable = peTotalPe - peUsed;

    if (action === "validate") {
      return new Response(JSON.stringify({
        ok: invalidPixels.length === 0,
        validPixels: validPixels.map(p => ({ x: p.x, y: p.y, amount: p.amount, side: p.side })),
        invalidPixels,
        totalRefund,
        previewPeStatusAfter: {
          peTotalPe,
          peUsed: peUsed - totalRefund,
          peAvailable: peAvailable + totalRefund,
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // COMMIT: Delete contribution rows
    if (validPixels.length === 0) {
      return new Response(JSON.stringify({
        ok: false,
        error: "No valid contributions to withdraw",
        invalidPixels,
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contribIds = validPixels.map(p => p.contribId);
    const { error: deleteError } = await supabase
      .from("pixel_contributions")
      .delete()
      .in("id", contribIds);

    if (deleteError) {
      console.error("Error deleting contributions:", deleteError);
      return new Response(JSON.stringify({ error: "Failed to withdraw contributions" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return updated PE status
    return new Response(JSON.stringify({
      ok: true,
      withdrawnCount: validPixels.length,
      refundedTotal: totalRefund,
      withdrawnPixels: validPixels.map(p => ({ x: p.x, y: p.y, amount: p.amount, side: p.side })),
      peStatus: {
        peTotalPe,
        peUsed: peUsed - totalRefund,
        peAvailable: peAvailable + totalRefund,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("contribution-withdraw error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
