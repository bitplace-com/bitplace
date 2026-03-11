import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Allowed origins for CORS (restrict to known origins for authenticated endpoints)
const ALLOWED_ORIGINS = [
  "https://bitplace.live",
  "https://www.bitplace.live",
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

// Verify JWT token - extract userId from token
async function verifyToken(token: string, secret: string): Promise<{ wallet: string; userId: string; exp: number; authProvider?: string } | null> {
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

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT token from Authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("[pe-status] Missing or invalid Authorization header");
      return new Response(JSON.stringify({ ok: false, error: "UNAUTHORIZED" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const authSecret = Deno.env.get("AUTH_SECRET");
    if (!authSecret) {
      console.error("[pe-status] AUTH_SECRET not configured");
      return new Response(JSON.stringify({ ok: false, error: "SERVER_ERROR" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await verifyToken(token, authSecret);
    if (!payload) {
      console.log("[pe-status] Invalid or expired token");
      return new Response(JSON.stringify({ ok: false, error: "UNAUTHORIZED" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = payload.userId;
    console.log("[pe-status] Fetching PE status for user:", userId);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch user data
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("pe_total_pe, auth_provider, virtual_pe_total, virtual_pe_used")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      console.error("[pe-status] User fetch error:", userError);
      return new Response(JSON.stringify({ ok: false, error: "USER_NOT_FOUND" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authProvider = user.auth_provider || 'wallet';
    const isGoogleOnly = authProvider === 'google';

    // For Google-only users, return virtual PE stats
    if (isGoogleOnly) {
      const virtualPeTotal = Number(user.virtual_pe_total) || 0;
      const virtualPeUsed = Number(user.virtual_pe_used) || 0;
      const virtualPeAvailable = Math.max(0, virtualPeTotal - virtualPeUsed);

      console.log("[pe-status] Google-only result:", { virtualPeTotal, virtualPeUsed, virtualPeAvailable });

      return new Response(JSON.stringify({
        ok: true,
        isVirtualPe: true,
        pe_total: virtualPeTotal,
        pe_used: virtualPeUsed,
        pe_available: virtualPeAvailable,
        pixel_stake_total: 0,
        contribution_total: 0,
        virtual_pe_total: virtualPeTotal,
        virtual_pe_used: virtualPeUsed,
        virtual_pe_available: virtualPeAvailable,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Wallet users: original PE calculation
    const peTotal = user.pe_total_pe || 0;

    // Fetch sum of owner_stake_pe for pixels owned by user
    const { data: pixelStakes } = await supabase
      .from("pixels")
      .select("owner_stake_pe")
      .eq("owner_user_id", userId);

    const pixelStakeTotal = (pixelStakes || []).reduce(
      (sum, p) => sum + Number(p.owner_stake_pe || 0),
      0
    );

    // Fetch sum of contributions by user
    const { data: contributions } = await supabase
      .from("pixel_contributions")
      .select("amount_pe")
      .eq("user_id", userId);

    const contributionTotal = (contributions || []).reduce(
      (sum, c) => sum + Number(c.amount_pe || 0),
      0
    );

    const peUsed = pixelStakeTotal + contributionTotal;
    const peAvailable = Math.max(0, peTotal - peUsed);

    // Include virtual PE info for 'both' users
    const virtualPeFields = authProvider === 'both' ? {
      virtual_pe_total: Number(user.virtual_pe_total) || 0,
      virtual_pe_used: Number(user.virtual_pe_used) || 0,
      virtual_pe_available: Math.max(0, (Number(user.virtual_pe_total) || 0) - (Number(user.virtual_pe_used) || 0)),
    } : {};

    console.log("[pe-status] Result:", { peTotal, pixelStakeTotal, contributionTotal, peUsed, peAvailable });

    return new Response(JSON.stringify({
      ok: true,
      pe_total: peTotal,
      pe_used: peUsed,
      pe_available: peAvailable,
      pixel_stake_total: pixelStakeTotal,
      contribution_total: contributionTotal,
      ...virtualPeFields,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[pe-status] Error:", err);
    return new Response(JSON.stringify({ ok: false, error: "INTERNAL_ERROR" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});