import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple rate limiting per IP
const ipRateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 1100; // Nominatim requires 1 req/s

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lat, lng } = await req.json();

    if (typeof lat !== 'number' || typeof lng !== 'number' ||
        Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return new Response(
        JSON.stringify({ error: 'Invalid coordinates' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limit
    const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();
    const lastRequest = ipRateLimitMap.get(clientIp) || 0;
    if (now - lastRequest < RATE_LIMIT_MS) {
      return new Response(
        JSON.stringify({ error: 'Rate limited' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    ipRateLimitMap.set(clientIp, now);

    console.log(`[reverse-geocode] ${lat}, ${lng}`);

    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=16&addressdetails=1`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Bitplace/1.0 (https://bitplace.live)',
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      console.error(`[reverse-geocode] Nominatim error: ${response.status}`);
      return new Response(
        JSON.stringify({ error: 'Geocoding service error' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();

    // Handle "no results" from Nominatim (e.g. middle of ocean)
    if (result.error) {
      return new Response(
        JSON.stringify({ address: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ address: result.display_name || null }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[reverse-geocode] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
