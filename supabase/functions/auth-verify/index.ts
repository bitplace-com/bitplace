import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nacl from "https://esm.sh/tweetnacl@1.0.3";
import bs58 from "https://esm.sh/bs58@5.0.0";

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

// JWT token signing using HMAC (3-part format: header.payload.signature)
async function signToken(payload: object, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  
  // Standard JWT header
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB64 = btoa(JSON.stringify(header))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  
  const payloadB64 = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  // Sign the header.payload combination
  const signatureInput = `${headerB64}.${payloadB64}`;
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(signatureInput)
  );
  
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    
  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { wallet, signature, nonce } = await req.json();

    if (!wallet || !signature || !nonce) {
      console.error('Missing required fields');
      return new Response(
        JSON.stringify({ error: 'wallet, signature, and nonce are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Verifying signature for wallet: ${wallet.substring(0, 8)}...`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authSecret = Deno.env.get('AUTH_SECRET')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify nonce exists and hasn't been used
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: nonceData, error: nonceError } = await supabase
      .from('auth_nonces')
      .select('*')
      .eq('wallet_address', wallet)
      .eq('nonce', nonce)
      .is('used_at', null)
      .gte('created_at', fiveMinutesAgo)
      .maybeSingle();

    if (nonceError || !nonceData) {
      console.error('Invalid or expired nonce:', nonceError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired nonce' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the signature using tweetnacl
    try {
      const messageBytes = new TextEncoder().encode(nonce);
      const signatureBytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
      const publicKeyBytes = bs58.decode(wallet);
      
      const isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
      
      if (!isValid) {
        console.error('Invalid signature');
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch (verifyError) {
      console.error('Signature verification error:', verifyError);
      return new Response(
        JSON.stringify({ error: 'Signature verification failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Signature verified successfully');

    // Mark nonce as used
    await supabase
      .from('auth_nonces')
      .update({ used_at: new Date().toISOString() })
      .eq('id', nonceData.id);

    // Create or fetch user
    let { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', wallet)
      .maybeSingle();

    if (!user) {
      console.log('Creating new user for wallet');
      // Generate wallet_short as default display_name
      const walletShort = `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({ 
          wallet_address: wallet,
          display_name: walletShort,  // Default to shortened wallet
        })
        .select()
        .single();

      if (createError) {
        console.error('Failed to create user:', createError);
        return new Response(
          JSON.stringify({ error: 'Failed to create user' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      user = newUser;
    }

    // Generate session token (24 hours expiry)
    const tokenPayload = {
      wallet: wallet,
      userId: user.id,
      exp: Date.now() + 24 * 60 * 60 * 1000,
    };

    const token = await signToken(tokenPayload, authSecret);

    console.log('Authentication successful, token generated');

    return new Response(
      JSON.stringify({ token, user }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in auth-verify:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
