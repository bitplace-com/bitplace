import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://bitplace.app",
  "https://www.bitplace.app",
  "http://localhost:5173",
  "http://localhost:3000",
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { wallet } = await req.json();

    if (!wallet || typeof wallet !== 'string') {
      console.error('Invalid wallet address provided');
      return new Response(
        JSON.stringify({ error: 'Wallet address is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating nonce for wallet: ${wallet.substring(0, 8)}...`);

    // Generate a random nonce
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    const nonceHex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    const timestamp = Date.now();
    const nonce = `Sign this message to authenticate with Bitplace:\n\nNonce: ${nonceHex}\nTimestamp: ${timestamp}`;

    // Store nonce in database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Clean up old nonces for this wallet (older than 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    await supabase
      .from('auth_nonces')
      .delete()
      .eq('wallet_address', wallet)
      .lt('created_at', fiveMinutesAgo);

    // Insert new nonce
    const { error: insertError } = await supabase
      .from('auth_nonces')
      .insert({
        wallet_address: wallet,
        nonce: nonce,
      });

    if (insertError) {
      console.error('Failed to store nonce:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate nonce' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Nonce generated and stored successfully');

    return new Response(
      JSON.stringify({ nonce }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in auth-nonce:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
