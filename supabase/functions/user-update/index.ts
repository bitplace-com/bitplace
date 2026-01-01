import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Verify and decode token
async function verifyToken(token: string, secret: string): Promise<{ wallet: string; userId: string; exp: number } | null> {
  try {
    const [payloadB64, signatureB64] = token.split('.');
    if (!payloadB64 || !signatureB64) return null;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signatureBytes = Uint8Array.from(atob(signatureB64), c => c.charCodeAt(0));
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      encoder.encode(payloadB64)
    );

    if (!isValid) return null;

    const payload = JSON.parse(atob(payloadB64));
    
    // Check expiration
    if (payload.exp < Date.now()) return null;

    return payload;
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
      if (country_code && (typeof country_code !== 'string' || country_code.length > 5)) {
        return new Response(
          JSON.stringify({ error: 'Country code must be a string under 5 characters' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      updates.country_code = country_code || null;
    }
    
    if (alliance_tag !== undefined) {
      if (alliance_tag && (typeof alliance_tag !== 'string' || alliance_tag.length > 10)) {
        return new Response(
          JSON.stringify({ error: 'Alliance tag must be a string under 10 characters' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
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
        // Validate URL format and protocol
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
