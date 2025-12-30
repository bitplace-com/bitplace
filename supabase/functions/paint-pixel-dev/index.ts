import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { x, y, color } = await req.json();

    // Validate input
    if (typeof x !== 'number' || typeof y !== 'number') {
      console.error('Invalid coordinates:', { x, y });
      return new Response(
        JSON.stringify({ error: 'x and y must be numbers' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (typeof color !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(color)) {
      console.error('Invalid color:', color);
      return new Response(
        JSON.stringify({ error: 'color must be a valid hex color (e.g., #FF0000)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Painting pixel:', { x, y, color });

    // Upsert pixel (insert or update if exists)
    const { data: pixel, error: pixelError } = await supabase
      .from('pixels')
      .upsert(
        { x, y, color, updated_at: new Date().toISOString() },
        { onConflict: 'x,y' }
      )
      .select()
      .single();

    if (pixelError) {
      console.error('Error upserting pixel:', pixelError);
      return new Response(
        JSON.stringify({ error: pixelError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log paint event
    const { error: eventError } = await supabase
      .from('paint_events')
      .insert({
        action_type: 'PAINT',
        pixel_count: 1,
        details: { x, y, color }
      });

    if (eventError) {
      console.warn('Error logging paint event:', eventError);
      // Don't fail the request for logging errors
    }

    console.log('Pixel painted successfully:', pixel);

    return new Response(
      JSON.stringify({ success: true, pixel }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
