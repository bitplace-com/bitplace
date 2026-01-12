import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limit: max 3 creates per minute per user
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_CREATES_PER_WINDOW = 3;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(userId) || [];
  const recentTimestamps = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  
  if (recentTimestamps.length >= MAX_CREATES_PER_WINDOW) {
    return false;
  }
  
  recentTimestamps.push(now);
  rateLimitMap.set(userId, recentTimestamps);
  return true;
}

// Grid constants (must match src/lib/pixelGrid.ts)
const TILE_SIZE = 512;
const GRID_ZOOM = 12;
const GRID_SIZE = TILE_SIZE * Math.pow(2, GRID_ZOOM); // 2,097,152
const MAX_LAT = 85.05112878;
const DEFAULT_BBOX_SIZE = 512; // Default bbox size in pixels

function clampLat(lat: number): number {
  return Math.max(-MAX_LAT, Math.min(MAX_LAT, lat));
}

function normalizeLng(lng: number): number {
  return ((lng + 180) % 360 + 360) % 360 - 180;
}

function lngLatToGridInt(lng: number, lat: number): { x: number; y: number } {
  const clampedLat = clampLat(lat);
  const normalizedLng = normalizeLng(lng);
  
  const xNorm = (normalizedLng + 180) / 360;
  const latRad = (clampedLat * Math.PI) / 180;
  const yNorm = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2;
  
  return { 
    x: Math.floor(xNorm * GRID_SIZE), 
    y: Math.floor(yNorm * GRID_SIZE) 
  };
}

// Verify custom JWT token
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

interface CreatePlaceRequest {
  title: string;
  description?: string;
  lat: number;
  lng: number;
  zoom?: number;
  bbox?: {
    xmin: number;
    ymin: number;
    xmax: number;
    ymax: number;
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth required
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
      console.error("[places-create] AUTH_SECRET not configured");
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

    // Rate limit check
    if (!checkRateLimit(userId)) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Max 3 places per minute." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: CreatePlaceRequest = await req.json();
    const { title, description, lat, lng, zoom = 12, bbox } = body;

    // Validate input
    if (!title || title.trim().length === 0 || title.length > 100) {
      return new Response(
        JSON.stringify({ error: "Title is required and must be 1-100 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (description && description.length > 500) {
      return new Response(
        JSON.stringify({ error: "Description must be 500 characters or less" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (typeof lat !== "number" || lat < -90 || lat > 90) {
      return new Response(
        JSON.stringify({ error: "Invalid latitude" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (typeof lng !== "number" || lng < -180 || lng > 180) {
      return new Response(
        JSON.stringify({ error: "Invalid longitude" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Compute center in pixel space
    const center = lngLatToGridInt(lng, lat);
    
    // Compute bbox: use provided or default 512x512 centered on location
    let bboxXmin: number, bboxYmin: number, bboxXmax: number, bboxYmax: number;
    
    if (bbox) {
      bboxXmin = bbox.xmin;
      bboxYmin = bbox.ymin;
      bboxXmax = bbox.xmax;
      bboxYmax = bbox.ymax;
    } else {
      const halfSize = Math.floor(DEFAULT_BBOX_SIZE / 2);
      bboxXmin = Math.max(0, center.x - halfSize);
      bboxYmin = Math.max(0, center.y - halfSize);
      bboxXmax = Math.min(GRID_SIZE - 1, center.x + halfSize);
      bboxYmax = Math.min(GRID_SIZE - 1, center.y + halfSize);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Insert place
    const { data: place, error } = await adminClient
      .from("places")
      .insert({
        creator_user_id: userId,
        title: title.trim(),
        description: description?.trim() || null,
        lat,
        lng,
        zoom,
        center_x: center.x,
        center_y: center.y,
        bbox_xmin: bboxXmin,
        bbox_ymin: bboxYmin,
        bbox_xmax: bboxXmax,
        bbox_ymax: bboxYmax,
        is_public: true,
      })
      .select()
      .single();

    if (error) {
      console.error("[places-create] Insert error:", error);
      throw error;
    }

    // Fetch creator profile for response
    const { data: creator } = await adminClient
      .from("public_user_profiles")
      .select("id, display_name, avatar_url, country_code, level, pixels_painted_total")
      .eq("id", userId)
      .single();

    console.log("[places-create] Created place:", place.id);

    return new Response(
      JSON.stringify({
        success: true,
        place: {
          ...place,
          creator,
          likes_count: 0,
          saves_count: 0,
          likedByMe: false,
          savedByMe: false,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[places-create] Error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
