import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Allowed origins for CORS (restrict to known origins for authenticated endpoints)
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

// Verify and decode token
async function verifyToken(token: string, secret: string): Promise<{ wallet: string; userId: string; exp: number; authProvider?: string } | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, signatureB64] = parts;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const sigStr = signatureB64.replace(/-/g, '+').replace(/_/g, '/');
    const sigBytes = Uint8Array.from(atob(sigStr), c => c.charCodeAt(0));
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      encoder.encode(`${headerB64}.${payloadB64}`)
    );

    if (!isValid) return null;

    const decoded = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(decoded));
    
    if (payload.exp < Date.now()) return null;

    return payload;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.substring(7);
    const authSecret = Deno.env.get('AUTH_SECRET')!;
    const payload = await verifyToken(token, authSecret);

    if (!payload) {
      console.error('Invalid or expired token');
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Updating user: ${payload.userId}`);

    const body = await req.json();
    const { display_name, country_code, alliance_tag, avatar_url } = body;

    // Validate inputs
    const updates: Record<string, string | null> = {};
    
    if (display_name !== undefined) {
      if (display_name) {
        if (typeof display_name !== 'string') {
          return new Response(
            JSON.stringify({ error: 'Display name must be a string' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (display_name.length < 3 || display_name.length > 20) {
          return new Response(
            JSON.stringify({ error: 'Display name must be 3-20 characters' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        // Only allow alphanumeric and underscores
        if (!/^[a-zA-Z0-9_]+$/.test(display_name)) {
          return new Response(
            JSON.stringify({ error: 'Display name can only contain letters, numbers, and underscores' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
      updates.display_name = display_name || null;
    }
    
    if (country_code !== undefined) {
      if (country_code) {
        if (typeof country_code !== 'string') {
          return new Response(
            JSON.stringify({ error: 'Country code must be a string' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (!/^[A-Z]{2}$/.test(country_code)) {
          return new Response(
            JSON.stringify({ error: 'Country code must be 2 uppercase letters (ISO format)' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
      updates.country_code = country_code || null;
    }
    
    if (alliance_tag !== undefined) {
      if (alliance_tag) {
        if (typeof alliance_tag !== 'string') {
          return new Response(
            JSON.stringify({ error: 'Alliance tag must be a string' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (!/^[A-Z]{2,5}$/.test(alliance_tag)) {
          return new Response(
            JSON.stringify({ error: 'Alliance tag must be 2-5 uppercase letters' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
      updates.alliance_tag = alliance_tag || null;
    }
    
    if (avatar_url !== undefined) {
      if (avatar_url) {
        if (typeof avatar_url !== 'string' || avatar_url.length > 500) {
          return new Response(
            JSON.stringify({ error: 'Avatar URL must be a string under 500 characters' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        try {
          const url = new URL(avatar_url);
          if (!['http:', 'https:'].includes(url.protocol)) {
            return new Response(
              JSON.stringify({ error: 'Avatar URL must use http or https protocol' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } catch {
          return new Response(
            JSON.stringify({ error: 'Invalid avatar URL format' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
      updates.avatar_url = avatar_url || null;
    }

    // Bio validation
    if (body.bio !== undefined) {
      if (body.bio && typeof body.bio === 'string' && body.bio.length > 160) {
        return new Response(
          JSON.stringify({ error: 'Bio must be 160 characters or less' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      updates.bio = body.bio || null;
    }

    // Social X validation
    if (body.social_x !== undefined) {
      if (body.social_x && typeof body.social_x === 'string' && body.social_x.length > 100) {
        return new Response(
          JSON.stringify({ error: 'Social X link must be 100 characters or less' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      updates.social_x = body.social_x || null;
    }

    // Social Instagram validation
    if (body.social_instagram !== undefined) {
      if (body.social_instagram && typeof body.social_instagram === 'string' && body.social_instagram.length > 100) {
        return new Response(
          JSON.stringify({ error: 'Social Instagram link must be 100 characters or less' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      updates.social_instagram = body.social_instagram || null;
    }

    // Social Website validation
    if (body.social_website !== undefined) {
      if (body.social_website && typeof body.social_website === 'string' && body.social_website.length > 200) {
        return new Response(
          JSON.stringify({ error: 'Website URL must be 200 characters or less' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      updates.social_website = body.social_website || null;
    }

    // Social Discord validation
    if (body.social_discord !== undefined) {
      if (body.social_discord && typeof body.social_discord === 'string' && body.social_discord.length > 100) {
        return new Response(
          JSON.stringify({ error: 'Discord link must be 100 characters or less' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      updates.social_discord = body.social_discord || null;
    }

    if (Object.keys(updates).length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid fields to update' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: user, error: updateError } = await supabase
      .from('users')
      .update(updates)
      .eq('id', payload.userId)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update user:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User updated successfully');

    return new Response(
      JSON.stringify({ user }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in user-update:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});