import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple in-memory rate limiting per IP
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 1100; // Nominatim requires 1 request/second

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    
    // Validate query exists and is a string
    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Query must be a string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const trimmed = query.trim();

    // Length validation (1-200 characters)
    if (trimmed.length === 0 || trimmed.length > 200) {
      return new Response(
        JSON.stringify({ error: 'Query must be 1-200 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Character whitelist - allow international characters with unicode letter class
    // Allows: letters (any language), numbers, spaces, common punctuation
    if (!/^[\p{L}\p{N}\s,.\-'"()]+$/u.test(trimmed)) {
      return new Response(
        JSON.stringify({ error: 'Query contains invalid characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limit check (simple per-instance, resets on cold start)
    const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
    const lastRequest = rateLimitMap.get(clientIp) || 0;
    const now = Date.now();
    
    if (now - lastRequest < RATE_LIMIT_MS) {
      console.log(`[geocode] Rate limited: ${clientIp}`);
      return new Response(
        JSON.stringify({ error: 'Rate limited. Please wait a moment.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    rateLimitMap.set(clientIp, now);

    console.log(`[geocode] Searching for: ${trimmed}`);

    // Call Nominatim API
    const url = `https://nominatim.openstreetmap.org/search?` +
      `q=${encodeURIComponent(trimmed)}&format=json&limit=5&addressdetails=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Bitplace/1.0 (https://bitplace.app)',
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      console.error(`[geocode] Nominatim error: ${response.status}`);
      return new Response(
        JSON.stringify({ error: 'Geocoding service error' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = await response.json();
    console.log(`[geocode] Found ${results.length} results`);

    // Map to simplified format
    const places = results.map((r: any) => ({
      name: r.display_name,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      type: r.type || r.class || 'place',
    }));

    return new Response(
      JSON.stringify({ places }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[geocode] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
