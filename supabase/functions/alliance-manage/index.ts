import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Verify JWT token
async function verifyToken(token: string, secret: string): Promise<{ wallet: string; userId: string; exp: number } | null> {
  try {
    const [headerB64, payloadB64, signatureB64] = token.split(".");
    if (!headerB64 || !payloadB64 || !signatureB64) return null;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const signatureInput = `${headerB64}.${payloadB64}`;
    const signature = Uint8Array.from(atob(signatureB64.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify("HMAC", key, signature, encoder.encode(signatureInput));
    if (!valid) return null;

    const payload = JSON.parse(atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")));
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;

    return payload;
  } catch {
    return null;
  }
}

// Generate random invite code
function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Avoid confusing chars
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Validate alliance name: 3-30 chars, alphanumeric + spaces
function validateName(name: string): { valid: boolean; error?: string } {
  if (!name || typeof name !== "string") {
    return { valid: false, error: "Name is required" };
  }
  const trimmed = name.trim();
  if (trimmed.length < 3 || trimmed.length > 30) {
    return { valid: false, error: "Name must be 3-30 characters" };
  }
  if (!/^[a-zA-Z0-9 ]+$/.test(trimmed)) {
    return { valid: false, error: "Name can only contain letters, numbers, and spaces" };
  }
  return { valid: true };
}

// Validate alliance tag: 2-5 uppercase letters
function validateTag(tag: string): { valid: boolean; error?: string } {
  if (!tag || typeof tag !== "string") {
    return { valid: false, error: "Tag is required" };
  }
  const trimmed = tag.trim().toUpperCase();
  if (trimmed.length < 2 || trimmed.length > 5) {
    return { valid: false, error: "Tag must be 2-5 characters" };
  }
  if (!/^[A-Z]+$/.test(trimmed)) {
    return { valid: false, error: "Tag can only contain letters" };
  }
  return { valid: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.slice(7);
    const secret = Deno.env.get("AUTH_SECRET");
    if (!secret) {
      return new Response(JSON.stringify({ error: "Server config error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await verifyToken(token, secret);
    if (!payload) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = payload.userId;

    // Parse request body
    const body = await req.json();
    const { action } = body;

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log(`[alliance-manage] Action: ${action}, User: ${userId}`);

    // GET - Get current user's alliance
    if (action === "get") {
      const { data: membership } = await supabase
        .from("alliance_members")
        .select("alliance_id, role")
        .eq("user_id", userId)
        .maybeSingle();

      if (!membership) {
        return new Response(JSON.stringify({ alliance: null }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: alliance } = await supabase
        .from("alliances")
        .select("*")
        .eq("id", membership.alliance_id)
        .single();

      const { data: members } = await supabase
        .from("alliance_members")
        .select(`
          user_id,
          role,
          joined_at,
          users:user_id (
            display_name,
            wallet_address,
            level
          )
        `)
        .eq("alliance_id", membership.alliance_id)
        .order("joined_at", { ascending: true });

      const { count } = await supabase
        .from("alliance_members")
        .select("*", { count: "exact", head: true })
        .eq("alliance_id", membership.alliance_id);

      return new Response(JSON.stringify({
        alliance: {
          ...alliance,
          memberCount: count || 0,
          isLeader: membership.role === "leader",
        },
        members: members?.map(m => ({
          userId: m.user_id,
          displayName: (m.users as any)?.display_name,
          walletAddress: (m.users as any)?.wallet_address,
          level: (m.users as any)?.level || 1,
          role: m.role,
          joinedAt: m.joined_at,
        })) || [],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // CREATE - Create new alliance
    if (action === "create") {
      const { name, tag } = body;

      // Check if user already in alliance
      const { data: existing } = await supabase
        .from("alliance_members")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        return new Response(JSON.stringify({ error: "Already in an alliance" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate inputs
      const nameCheck = validateName(name);
      if (!nameCheck.valid) {
        return new Response(JSON.stringify({ error: nameCheck.error }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const tagCheck = validateTag(tag);
      if (!tagCheck.valid) {
        return new Response(JSON.stringify({ error: tagCheck.error }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const finalTag = tag.trim().toUpperCase();

      // Check if tag is taken
      const { data: tagExists } = await supabase
        .from("alliances")
        .select("id")
        .eq("tag", finalTag)
        .maybeSingle();

      if (tagExists) {
        return new Response(JSON.stringify({ error: "Tag already taken" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Generate unique invite code
      let inviteCode = generateInviteCode();
      let attempts = 0;
      while (attempts < 10) {
        const { data: codeExists } = await supabase
          .from("alliances")
          .select("id")
          .eq("invite_code", inviteCode)
          .maybeSingle();
        if (!codeExists) break;
        inviteCode = generateInviteCode();
        attempts++;
      }

      // Create alliance
      const { data: alliance, error: allianceError } = await supabase
        .from("alliances")
        .insert({
          name: name.trim(),
          tag: finalTag,
          created_by: userId,
          invite_code: inviteCode,
        })
        .select()
        .single();

      if (allianceError) {
        console.error("[alliance-manage] Create error:", allianceError);
        return new Response(JSON.stringify({ error: "Failed to create alliance" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Add creator as leader
      await supabase.from("alliance_members").insert({
        user_id: userId,
        alliance_id: alliance.id,
        role: "leader",
      });

      // Update user's alliance_tag
      await supabase
        .from("users")
        .update({ alliance_tag: finalTag })
        .eq("id", userId);

      console.log(`[alliance-manage] Created alliance ${alliance.name} [${finalTag}]`);

      return new Response(JSON.stringify({
        success: true,
        alliance: { ...alliance, memberCount: 1, isLeader: true },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // JOIN - Join alliance via invite code
    if (action === "join") {
      const { inviteCode } = body;

      if (!inviteCode || typeof inviteCode !== "string") {
        return new Response(JSON.stringify({ error: "Invite code required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if user already in alliance
      const { data: existing } = await supabase
        .from("alliance_members")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        return new Response(JSON.stringify({ error: "Already in an alliance" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Find alliance by invite code
      const { data: alliance } = await supabase
        .from("alliances")
        .select("*")
        .eq("invite_code", inviteCode.trim().toUpperCase())
        .maybeSingle();

      if (!alliance) {
        return new Response(JSON.stringify({ error: "Invalid invite code" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Join alliance
      await supabase.from("alliance_members").insert({
        user_id: userId,
        alliance_id: alliance.id,
        role: "member",
      });

      // Update user's alliance_tag
      await supabase
        .from("users")
        .update({ alliance_tag: alliance.tag })
        .eq("id", userId);

      const { count } = await supabase
        .from("alliance_members")
        .select("*", { count: "exact", head: true })
        .eq("alliance_id", alliance.id);

      console.log(`[alliance-manage] User ${userId} joined ${alliance.name}`);

      return new Response(JSON.stringify({
        success: true,
        alliance: { ...alliance, memberCount: count || 1, isLeader: false },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // LEAVE - Leave current alliance
    if (action === "leave") {
      const { data: membership } = await supabase
        .from("alliance_members")
        .select("alliance_id, role")
        .eq("user_id", userId)
        .maybeSingle();

      if (!membership) {
        return new Response(JSON.stringify({ error: "Not in an alliance" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { count } = await supabase
        .from("alliance_members")
        .select("*", { count: "exact", head: true })
        .eq("alliance_id", membership.alliance_id);

      // If leader and others exist, transfer leadership
      if (membership.role === "leader" && (count || 0) > 1) {
        const { data: nextLeader } = await supabase
          .from("alliance_members")
          .select("user_id")
          .eq("alliance_id", membership.alliance_id)
          .neq("user_id", userId)
          .order("joined_at", { ascending: true })
          .limit(1)
          .single();

        if (nextLeader) {
          await supabase
            .from("alliance_members")
            .update({ role: "leader" })
            .eq("user_id", nextLeader.user_id);
        }
      }

      // Remove member
      await supabase
        .from("alliance_members")
        .delete()
        .eq("user_id", userId);

      // Clear user's alliance_tag
      await supabase
        .from("users")
        .update({ alliance_tag: null })
        .eq("id", userId);

      // If last member, delete alliance
      if ((count || 0) <= 1) {
        await supabase
          .from("alliances")
          .delete()
          .eq("id", membership.alliance_id);
      }

      console.log(`[alliance-manage] User ${userId} left alliance`);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[alliance-manage] Error:", err);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
