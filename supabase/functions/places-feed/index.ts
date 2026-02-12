import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Verify custom JWT token (optional for this endpoint)
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

interface FeedRequest {
  category: "new" | "trending" | "popular";
  limit?: number;
  offset?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authSecret = Deno.env.get("AUTH_SECRET");
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Optional auth
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ") && authSecret) {
      const token = authHeader.replace("Bearer ", "");
      const payload = await verifyToken(token, authSecret);
      if (payload) {
        userId = payload.userId;
      }
    }

    const body: FeedRequest = await req.json();
    const { category, limit = 20, offset = 0 } = body;

    if (!["new", "trending", "popular"].includes(category)) {
      return new Response(
        JSON.stringify({ error: "Invalid category. Must be 'new', 'trending', or 'popular'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const safeLimit = Math.min(Math.max(1, limit), 50);
    const safeOffset = Math.max(0, offset);

    // Fetch places based on category
    let placesQuery = adminClient
      .from("places")
      .select("*")
      .eq("is_public", true);

    if (category === "new") {
      // New: most recent first
      placesQuery = placesQuery
        .order("created_at", { ascending: false })
        .range(safeOffset, safeOffset + safeLimit - 1);
    } else if (category === "trending") {
      // Trending: most liked first
      placesQuery = placesQuery
        .order("likes_count", { ascending: false })
        .order("created_at", { ascending: false })
        .range(safeOffset, safeOffset + safeLimit - 1);
    } else {
      // Popular: will sort by total_pe after computing — fetch a batch
      placesQuery = placesQuery
        .order("created_at", { ascending: false })
        .limit(200);
    }

    const { data: places, error: placesError } = await placesQuery;
    if (placesError) throw placesError;

    if (!places || places.length === 0) {
      return new Response(
        JSON.stringify({ places: [], hasMore: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const placeIds = places.map(p => p.id);
    const creatorIds = [...new Set(places.map(p => p.creator_user_id))];

    // Fetch creator profiles
    const { data: creators } = await adminClient
      .from("public_user_profiles")
      .select("id, display_name, avatar_url, country_code, level, pixels_painted_total")
      .in("id", creatorIds);

    const creatorsMap = new Map(creators?.map(c => [c.id, c]) || []);

    // Compute total_pe for each place: only creator's pixels in bbox
    const totalPeMap = new Map<string, number>();
    for (const place of places) {
      if (place.bbox_xmin != null && place.bbox_ymin != null &&
          place.bbox_xmax != null && place.bbox_ymax != null) {
        const { data: sumData } = await adminClient
          .from("pixels")
          .select("owner_stake_pe")
          .gte("x", place.bbox_xmin)
          .lte("x", place.bbox_xmax)
          .gte("y", place.bbox_ymin)
          .lte("y", place.bbox_ymax)
          .eq("owner_user_id", place.creator_user_id);
        
        const totalPe = sumData?.reduce((sum, p) => sum + (p.owner_stake_pe || 0), 0) || 0;
        totalPeMap.set(place.id, totalPe);
      }
    }

    // Fetch user's likes and saves if authenticated
    let userLikesSet = new Set<string>();
    let userSavesSet = new Set<string>();

    if (userId) {
      const [likesResult, savesResult] = await Promise.all([
        adminClient.from("place_likes").select("place_id").eq("user_id", userId).in("place_id", placeIds),
        adminClient.from("place_saves").select("place_id").eq("user_id", userId).in("place_id", placeIds),
      ]);
      
      userLikesSet = new Set(likesResult.data?.map(l => l.place_id) || []);
      userSavesSet = new Set(savesResult.data?.map(s => s.place_id) || []);
    }

    // Build response
    let enrichedPlaces = places.map(place => ({
      id: place.id,
      title: place.title,
      description: place.description,
      lat: place.lat,
      lng: place.lng,
      zoom: place.zoom,
      center_x: place.center_x,
      center_y: place.center_y,
      bbox_xmin: place.bbox_xmin,
      bbox_ymin: place.bbox_ymin,
      bbox_xmax: place.bbox_xmax,
      bbox_ymax: place.bbox_ymax,
      created_at: place.created_at,
      creator: creatorsMap.get(place.creator_user_id) || null,
      stats: {
        likes_all_time: place.likes_count,
        saves_all_time: place.saves_count,
        total_pe: totalPeMap.get(place.id) || 0,
      },
      likedByMe: userLikesSet.has(place.id),
      savedByMe: userSavesSet.has(place.id),
    }));

    // For Popular: sort by total_pe and paginate
    if (category === "popular") {
      enrichedPlaces.sort((a, b) => b.stats.total_pe - a.stats.total_pe);
      enrichedPlaces = enrichedPlaces.slice(safeOffset, safeOffset + safeLimit);
    }

    const hasMore = category === "popular"
      ? enrichedPlaces.length === safeLimit
      : places.length === safeLimit;

    return new Response(
      JSON.stringify({ places: enrichedPlaces, hasMore }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[places-feed] Error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
