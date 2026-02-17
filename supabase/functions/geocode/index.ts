import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting maps: per-IP and per-user
const ipRateLimitMap = new Map<string, number>();
const userRateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 1100; // Nominatim requires 1 request/second
const ANON_RATE_LIMIT_MS = 2000; // Stricter for unauthenticated requests

// Simple JWT verification for optional auth
async function tryVerifyToken(authHeader: string | null): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const token = authHeader.slice(7);
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    // Verify signature using AUTH_SECRET
    const secret = Deno.env.get('AUTH_SECRET');
    if (!secret) return null;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const data = encoder.encode(`${parts[0]}.${parts[1]}`);
    const sig = await crypto.subtle.sign('HMAC', key, data);
    const expectedSig = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    if (parts[2] !== expectedSig) return null;
    return payload.userId || payload.sub || null;
  } catch {
    return null;
  }
}

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
    if (!/^[\p{L}\p{N}\s,.\-'"()]+$/u.test(trimmed)) {
      return new Response(
        JSON.stringify({ error: 'Query contains invalid characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try to authenticate user (optional)
    const userId = await tryVerifyToken(req.headers.get('Authorization'));
    const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();

    // Rate limit check: authenticated users get lighter limits, anon gets stricter
    if (userId) {
      const lastRequest = userRateLimitMap.get(userId) || 0;
      if (now - lastRequest < RATE_LIMIT_MS) {
        return new Response(
          JSON.stringify({ error: 'Rate limited. Please wait a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      userRateLimitMap.set(userId, now);
    } else {
      const lastRequest = ipRateLimitMap.get(clientIp) || 0;
      if (now - lastRequest < ANON_RATE_LIMIT_MS) {
        return new Response(
          JSON.stringify({ error: 'Rate limited. Please wait a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      ipRateLimitMap.set(clientIp, now);
    }
    
    console.log(`[geocode] Searching for: ${trimmed} (user: ${userId || 'anon'})`);

    console.log(`[geocode] Searching for: ${trimmed}`);

    // Call Nominatim API
    const url = `https://nominatim.openstreetmap.org/search?` +
      `q=${encodeURIComponent(trimmed)}&format=json&limit=5&addressdetails=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Bitplace/1.0 (https://bitplace.com)',
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
