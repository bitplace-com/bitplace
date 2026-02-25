import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

async function verifyToken(token: string, secret: string): Promise<{ wallet: string; userId: string; exp: number; authProvider?: string } | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      console.error("[notifications-manage] Invalid token format: expected 3 parts, got", parts.length);
      return null;
    }

    const [headerB64, payloadB64, signatureB64] = parts;
    const encoder = new TextEncoder();

    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const signatureB64Std = signatureB64.replace(/-/g, "+").replace(/_/g, "/");
    const signatureBytes = Uint8Array.from(atob(signatureB64Std), c => c.charCodeAt(0));

    const signatureInput = `${headerB64}.${payloadB64}`;
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes,
      encoder.encode(signatureInput)
    );

    if (!isValid) {
      console.error("[notifications-manage] Invalid signature");
      return null;
    }

    const payloadB64Std = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(payloadB64Std));

    if (payload.exp && Date.now() > payload.exp) {
      console.error("[notifications-manage] Token expired. exp:", payload.exp, "now:", Date.now());
      return null;
    }

    return payload;
  } catch (err) {
    console.error("[notifications-manage] Token verification error:", err);
    return null;
  }
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
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

    const payload = await verifyToken(token, secret);
    if (!payload) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = payload.userId;

    const body = await req.json();
    const { action } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log(`[notifications-manage] Action: ${action}, User: ${userId}`);

    // GET - Get notifications for user
    if (action === "get") {
      const limit = body.limit || 50;
      
      const { data: notifications, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("[notifications-manage] Get error:", error);
        return new Response(JSON.stringify({ error: "Failed to fetch notifications" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ notifications: notifications || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // MARK-READ - Mark specific notifications as read
    if (action === "mark-read") {
      const { notificationIds } = body;
      
      if (!notificationIds || !Array.isArray(notificationIds)) {
        return new Response(JSON.stringify({ error: "notificationIds required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .in("id", notificationIds)
        .eq("user_id", userId);

      if (error) {
        console.error("[notifications-manage] Mark read error:", error);
        return new Response(JSON.stringify({ error: "Failed to mark as read" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // MARK-ALL-READ - Mark all notifications as read
    if (action === "mark-all-read") {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false);

      if (error) {
        console.error("[notifications-manage] Mark all read error:", error);
        return new Response(JSON.stringify({ error: "Failed to mark all as read" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DELETE - Delete specific notifications
    if (action === "delete") {
      const { notificationIds } = body;
      
      if (!notificationIds || !Array.isArray(notificationIds)) {
        return new Response(JSON.stringify({ error: "notificationIds required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabase
        .from("notifications")
        .delete()
        .in("id", notificationIds)
        .eq("user_id", userId);

      if (error) {
        console.error("[notifications-manage] Delete error:", error);
        return new Response(JSON.stringify({ error: "Failed to delete" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // FOLLOW - Follow a user
    if (action === "follow") {
      const { targetUserId } = body;
      
      if (!targetUserId || targetUserId === userId) {
        return new Response(JSON.stringify({ error: "Invalid target" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: existing } = await supabase
        .from("user_follows")
        .select("id")
        .eq("follower_id", userId)
        .eq("followed_id", targetUserId)
        .single();

      if (existing) {
        return new Response(JSON.stringify({ success: true, alreadyFollowing: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabase
        .from("user_follows")
        .insert({ follower_id: userId, followed_id: targetUserId });

      if (error) {
        console.error("[notifications-manage] Follow error:", error);
        return new Response(JSON.stringify({ error: "Failed to follow" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // UNFOLLOW - Unfollow a user
    if (action === "unfollow") {
      const { targetUserId } = body;
      
      if (!targetUserId) {
        return new Response(JSON.stringify({ error: "targetUserId required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabase
        .from("user_follows")
        .delete()
        .eq("follower_id", userId)
        .eq("followed_id", targetUserId);

      if (error) {
        console.error("[notifications-manage] Unfollow error:", error);
        return new Response(JSON.stringify({ error: "Failed to unfollow" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[notifications-manage] Error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});