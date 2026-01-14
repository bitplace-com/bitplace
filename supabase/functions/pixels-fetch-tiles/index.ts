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

interface PixelRow {
  id: number;
  x: number;
  y: number;
  color: string;
  tile_x: number;
  tile_y: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const body: RequestBody = await req.json();
    const { tiles } = body;

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

    // Extract unique tile coordinates for efficient query
    const tileXValues = [...new Set(tiles.map(t => t.tx))];
    const tileYValues = [...new Set(tiles.map(t => t.ty))];

    // Use the RPC function to fetch pixels by tile coordinates
    const { data, error } = await supabase.rpc('get_pixels_by_tiles', {
      tile_x_list: tileXValues,
      tile_y_list: tileYValues,
    });

    if (error) {
      console.error("RPC error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pixels = (data || []) as PixelRow[];

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
        pixelCount: pixels.length
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
