import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nacl from "https://esm.sh/tweetnacl@1.0.3";
import bs58 from "https://esm.sh/bs58@5.0.0";

// Allowed origins for CORS (restrict to known origins for authenticated endpoints)
const ALLOWED_ORIGINS = [
  "https://bitplace.live",
  "https://www.bitplace.live",
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
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-link-token",
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

// Verify an existing JWT link token
async function verifyLinkToken(token: string, secret: string): Promise<{ userId: string; wallet: string; authProvider?: string } | null> {
  try {
    const [headerB64, payloadB64, signatureB64] = token.split('.');
    if (!headerB64 || !payloadB64 || !signatureB64) return null;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    );

    const signatureInput = `${headerB64}.${payloadB64}`;
    const sig = Uint8Array.from(atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify('HMAC', key, sig, encoder.encode(signatureInput));
    if (!valid) return null;

    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.exp && Date.now() > payload.exp) return null;

    return { userId: payload.userId, wallet: payload.wallet, authProvider: payload.authProvider };
  } catch {
    return null;
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { wallet, signature, nonce } = await req.json();
    // Check for linking header (Google user linking a wallet)
    const linkToken = req.headers.get('x-link-token');

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

    // === LINKING FLOW: Google user linking a wallet ===
    if (linkToken) {
      console.log('Link token detected, attempting wallet linking...');
      
      // Verify the link token
      const linkPayload = await verifyLinkToken(linkToken, authSecret);
      if (!linkPayload) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired link token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if wallet is already used by another user
      const { data: existingWalletUser } = await supabase
        .from('users')
        .select('*')
        .eq('wallet_address', wallet)
        .maybeSingle();

      if (existingWalletUser && existingWalletUser.id !== linkPayload.userId) {
        // Only merge if the existing wallet user is wallet-only
        if (existingWalletUser.auth_provider !== 'wallet') {
          console.error('Wallet linked to another multi-auth account');
          return new Response(
            JSON.stringify({ error: 'This wallet is already linked to another multi-auth account' }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // === ACCOUNT MERGE: transfer everything from wallet-only user to Google user ===
        const walletUserId = existingWalletUser.id;
        const googleUserId = linkPayload.userId;
        console.log(`Merging wallet-only user ${walletUserId} into Google user ${googleUserId}`);

        // Transfer pixels
        await supabase.from('pixels').update({ owner_user_id: googleUserId }).eq('owner_user_id', walletUserId);
        // Transfer pixel contributions
        await supabase.from('pixel_contributions').update({ user_id: googleUserId }).eq('user_id', walletUserId);
        // Transfer notifications
        await supabase.from('notifications').update({ user_id: googleUserId }).eq('user_id', walletUserId);
        // Transfer user_pins
        await supabase.from('user_pins').update({ user_id: googleUserId }).eq('user_id', walletUserId);
        // Transfer places
        await supabase.from('places').update({ creator_user_id: googleUserId }).eq('creator_user_id', walletUserId);
        // Transfer follows (follower side)
        await supabase.from('user_follows').update({ follower_id: googleUserId }).eq('follower_id', walletUserId);
        // Transfer follows (followed side)
        await supabase.from('user_follows').update({ followed_id: googleUserId }).eq('followed_id', walletUserId);
        // Transfer alliance membership
        await supabase.from('alliance_members').update({ user_id: googleUserId }).eq('user_id', walletUserId);

        // Clear wallet_address on old user to avoid unique constraint violation
        await supabase.from('users').update({ wallet_address: null }).eq('id', walletUserId);

        // Merge stats onto Google user
        const { data: googleUser } = await supabase.from('users').select('*').eq('id', googleUserId).single();
        if (!googleUser) {
          return new Response(
            JSON.stringify({ error: 'Google user not found during merge' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: mergedUser, error: mergeError } = await supabase
          .from('users')
          .update({
            wallet_address: wallet,
            auth_provider: 'both',
            pixels_painted_total: (googleUser.pixels_painted_total || 0) + (existingWalletUser.pixels_painted_total || 0),
            pe_used_pe: (googleUser.pe_used_pe || 0) + (existingWalletUser.pe_used_pe || 0),
            takeover_def_pe_total: (googleUser.takeover_def_pe_total || 0) + (existingWalletUser.takeover_def_pe_total || 0),
            takeover_atk_pe_total: (googleUser.takeover_atk_pe_total || 0) + (existingWalletUser.takeover_atk_pe_total || 0),
            xp: (googleUser.xp || 0) + (existingWalletUser.xp || 0),
            virtual_pe_total: 300000,
            alliance_tag: googleUser.alliance_tag || existingWalletUser.alliance_tag,
          })
          .eq('id', googleUserId)
          .select()
          .single();

        if (mergeError || !mergedUser) {
          console.error('Failed to merge accounts:', mergeError);
          return new Response(
            JSON.stringify({ error: 'Failed to merge accounts' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Delete the old wallet-only user
        await supabase.from('users').delete().eq('id', walletUserId);
        console.log(`Account merge complete. Wallet user ${walletUserId} deleted.`);

        // Generate new token
        const tokenPayload = {
          wallet: wallet,
          userId: mergedUser.id,
          authProvider: 'both',
          exp: Date.now() + 24 * 60 * 60 * 1000,
        };
        const token = await signToken(tokenPayload, authSecret);

        return new Response(
          JSON.stringify({ token, user: mergedUser }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // No conflict or wallet belongs to same user — just update
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({ 
          wallet_address: wallet,
          auth_provider: 'both',
        })
        .eq('id', linkPayload.userId)
        .select()
        .single();

      if (updateError || !updatedUser) {
        console.error('Failed to link wallet:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to link wallet' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Generate new token with authProvider: 'both'
      const tokenPayload = {
        wallet: wallet,
        userId: updatedUser.id,
        authProvider: 'both',
        exp: Date.now() + 24 * 60 * 60 * 1000,
      };
      const token = await signToken(tokenPayload, authSecret);

      console.log('Wallet linked successfully, new token generated');
      return new Response(
        JSON.stringify({ token, user: updatedUser }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // === NORMAL FLOW: Create or fetch user by wallet ===
    let { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', wallet)
      .maybeSingle();

    if (!user) {
      console.log('Creating new user for wallet');
      const walletShort = `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({ 
          wallet_address: wallet,
          display_name: walletShort,
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
