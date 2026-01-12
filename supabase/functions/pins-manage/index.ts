import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PinsManageRequest {
  action: "list" | "add" | "remove" | "rename";
  pin?: {
    label: string;
    lat: number;
    lng: number;
    zoom?: number;
  };
  pinId?: string;
  newLabel?: string;
}

// Verify custom JWT token - same implementation as other edge functions
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const authSecret = Deno.env.get("AUTH_SECRET");
    if (!authSecret) {
      console.error("[pins-manage] AUTH_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = await verifyToken(token, authSecret);
    if (!payload) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = payload.userId;
    console.log("[pins-manage] Request for user:", userId);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Use service role client for DB operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const body: PinsManageRequest = await req.json();
    const { action, pin, pinId, newLabel } = body;

    switch (action) {
      case "list": {
        const { data, error } = await adminClient
          .from("user_pins")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (error) throw error;
        return new Response(
          JSON.stringify({ pins: data }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "add": {
        if (!pin) {
          return new Response(
            JSON.stringify({ error: "Pin data required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data, error } = await adminClient
          .from("user_pins")
          .insert({
            user_id: userId,
            label: pin.label,
            lat: pin.lat,
            lng: pin.lng,
            zoom: pin.zoom ?? 12,
          })
          .select()
          .single();

        if (error) {
          if (error.code === "23505") {
            return new Response(
              JSON.stringify({ error: "Location already pinned" }),
              { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          throw error;
        }

        return new Response(
          JSON.stringify({ pin: data }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "remove": {
        if (!pinId) {
          return new Response(
            JSON.stringify({ error: "Pin ID required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error } = await adminClient
          .from("user_pins")
          .delete()
          .eq("id", pinId)
          .eq("user_id", userId);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "rename": {
        if (!pinId || !newLabel) {
          return new Response(
            JSON.stringify({ error: "Pin ID and new label required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data, error } = await adminClient
          .from("user_pins")
          .update({ label: newLabel })
          .eq("id", pinId)
          .eq("user_id", userId)
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ pin: data }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("pins-manage error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
