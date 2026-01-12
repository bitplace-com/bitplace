import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
      console.error("[places-my] AUTH_SECRET not configured");
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch user's saved places
    const { data: savedPlaceIds } = await adminClient
      .from("place_saves")
      .select("place_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    // Fetch user's created places
    const { data: createdPlaces } = await adminClient
      .from("places")
      .select("*")
      .eq("creator_user_id", userId)
      .order("created_at", { ascending: false });

    // Fetch saved places details
    let savedPlaces: any[] = [];
    if (savedPlaceIds && savedPlaceIds.length > 0) {
      const { data } = await adminClient
        .from("places")
        .select("*")
        .in("id", savedPlaceIds.map(s => s.place_id))
        .eq("is_public", true);
      
      savedPlaces = data || [];
    }

    // Get all unique creator IDs for saved places
    const allPlaces = [...savedPlaces, ...(createdPlaces || [])];
    const creatorIds = [...new Set(allPlaces.map(p => p.creator_user_id))];

    // Fetch creator profiles
    const { data: creators } = await adminClient
      .from("public_user_profiles")
      .select("id, display_name, avatar_url, country_code, level, pixels_painted_total")
      .in("id", creatorIds);

    const creatorsMap = new Map(creators?.map(c => [c.id, c]) || []);

    // Fetch user's likes for all these places
    const allPlaceIds = allPlaces.map(p => p.id);
    const { data: userLikes } = await adminClient
      .from("place_likes")
      .select("place_id")
      .eq("user_id", userId)
      .in("place_id", allPlaceIds);

    const userLikesSet = new Set(userLikes?.map(l => l.place_id) || []);

    // Enrich places with creator and flags
    const enrichPlace = (place: any) => ({
      id: place.id,
      title: place.title,
      description: place.description,
      lat: place.lat,
      lng: place.lng,
      zoom: place.zoom,
      center_x: place.center_x,
      center_y: place.center_y,
      created_at: place.created_at,
      creator: creatorsMap.get(place.creator_user_id) || null,
      stats: {
        likes_all_time: place.likes_count,
        saves_all_time: place.saves_count,
      },
      likedByMe: userLikesSet.has(place.id),
      savedByMe: true, // All saved places are saved by me
      isOwner: place.creator_user_id === userId,
    });

    // Sort saved places by saved order
    const savedPlacesOrdered = savedPlaceIds
      ?.map(s => savedPlaces.find(p => p.id === s.place_id))
      .filter(Boolean)
      .map(enrichPlace) || [];

    const createdPlacesEnriched = (createdPlaces || []).map(p => ({
      ...enrichPlace(p),
      savedByMe: savedPlaceIds?.some(s => s.place_id === p.id) || false,
    }));

    console.log(`[places-my] User ${userId}: ${savedPlacesOrdered.length} saved, ${createdPlacesEnriched.length} created`);

    return new Response(
      JSON.stringify({
        saved_places: savedPlacesOrdered,
        created_places: createdPlacesEnriched,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[places-my] Error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
