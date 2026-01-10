import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TileCoord {
  tx: number;
  ty: number;
}

interface RequestBody {
  tiles: TileCoord[];
  fields?: "render" | "details";
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: RequestBody = await req.json();
    const { tiles, fields = "render" } = body;

    if (!tiles || !Array.isArray(tiles) || tiles.length === 0) {
      return new Response(
        JSON.stringify({ error: "tiles array required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Limit to max 50 tiles per request
    if (tiles.length > 50) {
      return new Response(
        JSON.stringify({ error: "max 50 tiles per request" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build query based on field type
    const selectFields = fields === "render" 
      ? "x, y, color, tile_x, tile_y"
      : "x, y, color, owner_user_id, owner_stake_pe, def_total, atk_total, tile_x, tile_y";

    // Extract unique tile coordinates for efficient OR query
    const tileXValues = [...new Set(tiles.map(t => t.tx))];
    const tileYValues = [...new Set(tiles.map(t => t.ty))];

    // Use raw SQL query via RPC for tile columns (generated columns might not be in types yet)
    // Query using x/y calculation to find matching tiles
    const { data, error } = await supabase.rpc('get_pixels_by_tiles' as never, {
      tile_x_list: tileXValues,
      tile_y_list: tileYValues,
    } as never).select('*');

    // Fallback: direct query if RPC doesn't exist
    let pixels: Array<{ x: number; y: number; color: string; tile_x: number; tile_y: number }> = [];
    
    if (error || !data) {
      // Fallback to calculated tile query
      const fallbackResult = await supabase
        .from("pixels")
        .select("x, y, color")
        .limit(50000);
      
      if (fallbackResult.error) {
        console.error("Query error:", fallbackResult.error);
        return new Response(
          JSON.stringify({ error: fallbackResult.error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Calculate tile coords client-side and filter
      pixels = (fallbackResult.data || []).map(p => ({
        x: p.x as number,
        y: p.y as number,
        color: p.color as string,
        tile_x: Math.floor((p.x as number) / 512),
        tile_y: Math.floor((p.y as number) / 512),
      }));
    } else {
      pixels = (data as unknown as Array<{ x: number; y: number; color: string }>).map(p => ({
        x: p.x,
        y: p.y,
        color: p.color,
        tile_x: Math.floor(p.x / 512),
        tile_y: Math.floor(p.y / 512),
      }));
    }

    // Create set of requested tile keys for fast lookup
    const requestedTileKeys = new Set(tiles.map(t => `${t.tx}:${t.ty}`));

    // Group pixels by tile, filtering to only requested tiles
    const tileGroups: Record<string, Array<{ x: number; y: number; color: string }>> = {};

    for (const pixel of pixels) {
      const key = `${pixel.tile_x}:${pixel.tile_y}`;
      if (!requestedTileKeys.has(key)) continue;
      
      if (!tileGroups[key]) {
        tileGroups[key] = [];
      }
      
      tileGroups[key].push({
        x: pixel.x,
        y: pixel.y,
        color: pixel.color,
      });
    }

    // Include empty arrays for tiles with no pixels
    for (const tile of tiles) {
      const key = `${tile.tx}:${tile.ty}`;
      if (!tileGroups[key]) {
        tileGroups[key] = [];
      }
    }

    return new Response(
      JSON.stringify({ 
        tiles: tileGroups,
        tileCount: tiles.length,
        pixelCount: data?.length || 0
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
