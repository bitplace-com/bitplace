import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Allowed origins for CORS
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
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
  };
}

// JWT token signing using HMAC (same as auth-verify)
async function signToken(payload: object, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB64 = btoa(JSON.stringify(header))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const payloadB64 = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  
  const signatureInput = `${headerB64}.${payloadB64}`;
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signatureInput));
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  
  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

const VIRTUAL_PE_TOTAL = 300000;

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the Supabase Auth access token from Authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "UNAUTHORIZED", message: "Missing Supabase Auth token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAccessToken = authHeader.replace("Bearer ", "");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authSecret = Deno.env.get("AUTH_SECRET")!;
    
    // Create a client with the user's token to verify their identity
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${supabaseAccessToken}` } },
    });
    
    // Verify the Supabase Auth session
    const { data: { user: authUser }, error: authError } = await supabaseAuth.auth.getUser();
    
    if (authError || !authUser) {
      console.error("[auth-google] Supabase Auth verification failed:", authError);
      return new Response(JSON.stringify({ error: "UNAUTHORIZED", message: "Invalid Supabase Auth session" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[auth-google] Verified Google user:", authUser.email, authUser.id);

    // Use service role for DB operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user already exists by google_user_id
    let { data: existingUser } = await supabase
      .from("users")
      .select("*")
      .eq("google_user_id", authUser.id)
      .maybeSingle();

    // If not found by google_user_id, check by email (migration case)
    if (!existingUser && authUser.email) {
      const { data: emailUser } = await supabase
        .from("users")
        .select("*")
        .eq("email", authUser.email)
        .maybeSingle();
      
      if (emailUser) {
        // Link existing user to this Google account
        existingUser = emailUser;
        await supabase.from("users").update({ google_user_id: authUser.id }).eq("id", emailUser.id);
        console.log("[auth-google] Linked existing user by email:", emailUser.id);
      }
    }

    let user;

    if (existingUser) {
      user = existingUser;
      
      // Update Google-specific fields on each login
      const updates: Record<string, unknown> = {
        google_avatar_url: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null,
        email: authUser.email,
      };
      
      // If user was wallet-only, upgrade to 'both'
      if (user.auth_provider === 'wallet' && user.wallet_address) {
        updates.auth_provider = 'both';
        // Grant virtual PE if they don't have any
        if (!user.virtual_pe_total || user.virtual_pe_total === 0) {
          updates.virtual_pe_total = VIRTUAL_PE_TOTAL;
          updates.virtual_pe_used = 0;
        }
      }
      
      await supabase.from("users").update(updates).eq("id", user.id);
      
      // Re-fetch to get updated data
      const { data: refreshed } = await supabase.from("users").select("*").eq("id", user.id).single();
      if (refreshed) user = refreshed;
      
      console.log("[auth-google] Existing user logged in:", user.id, "provider:", user.auth_provider);
    } else {
      // Create new Google user
      const displayName = authUser.user_metadata?.full_name || 
                          authUser.user_metadata?.name || 
                          authUser.email?.split('@')[0] || 
                          'Player';
      
      const { data: newUser, error: createError } = await supabase
        .from("users")
        .insert({
          auth_provider: 'google',
          email: authUser.email,
          google_user_id: authUser.id,
          google_avatar_url: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null,
          display_name: displayName,
          virtual_pe_total: VIRTUAL_PE_TOTAL,
          virtual_pe_used: 0,
        })
        .select()
        .single();

      if (createError || !newUser) {
        console.error("[auth-google] Failed to create user:", createError);
        return new Response(JSON.stringify({ error: "CREATE_FAILED", message: "Failed to create user account" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      user = newUser;
      console.log("[auth-google] New Google user created:", user.id);
    }

    // Generate custom JWT (same format as wallet auth)
    const tokenPayload = {
      wallet: user.wallet_address || null,
      userId: user.id,
      authProvider: user.auth_provider,
      exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    };

    const token = await signToken(tokenPayload, authSecret);

    console.log("[auth-google] Token generated for user:", user.id);

    return new Response(JSON.stringify({ token, user }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[auth-google] Error:", error);
    return new Response(JSON.stringify({ error: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
