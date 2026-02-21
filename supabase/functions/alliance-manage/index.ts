import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Allowed origins for CORS
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

// Verify JWT token
async function verifyToken(token: string, secret: string): Promise<{ wallet: string; userId: string; exp: number } | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      console.error("[alliance-manage] Invalid token format: wrong number of parts");
      return null;
    }
    
    const [headerB64, payloadB64, signatureB64] = parts;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const signatureInput = `${headerB64}.${payloadB64}`;
    // Handle URL-safe Base64 encoding
    const signatureFixed = signatureB64.replace(/-/g, "+").replace(/_/g, "/");
    const signature = Uint8Array.from(atob(signatureFixed), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify("HMAC", key, signature, encoder.encode(signatureInput));
    
    if (!valid) {
      console.error("[alliance-manage] Invalid signature");
      return null;
    }

    const payloadFixed = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(payloadFixed));
    
    // exp is in SECONDS (Unix timestamp), Date.now() is in milliseconds
    if (payload.exp && Date.now() > payload.exp * 1000) {
      console.error("[alliance-manage] Token expired");
      return null;
    }

    return payload;
  } catch (e) {
    console.error("[alliance-manage] Token verification error:", e);
    return null;
  }
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
  if (!/^[\p{L}\p{N} _\-.]+$/u.test(trimmed)) {
    return { valid: false, error: "Name can only contain letters, numbers, spaces, underscores, hyphens, and dots" };
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
  const corsHeaders = getCorsHeaders(req);
  
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

    const body = await req.json();
    const { action } = body;

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
            level,
            country_code
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
          level: (m.users as any)?.level || 1,
          countryCode: (m.users as any)?.country_code,
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

      const nameCheck = validateName(name);
      if (!nameCheck.valid) {
        console.error(`[alliance-manage] Name validation failed: ${nameCheck.error} (input: "${name}")`);
        return new Response(JSON.stringify({ error: nameCheck.error }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const tagCheck = validateTag(tag);
      if (!tagCheck.valid) {
        console.error(`[alliance-manage] Tag validation failed: ${tagCheck.error} (input: "${tag}")`);
        return new Response(JSON.stringify({ error: tagCheck.error }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const finalTag = tag.trim().toUpperCase();

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

      const { data: alliance, error: allianceError } = await supabase
        .from("alliances")
        .insert({
          name: name.trim(),
          tag: finalTag,
          created_by: userId,
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

      await supabase.from("alliance_members").insert({
        user_id: userId,
        alliance_id: alliance.id,
        role: "leader",
      });

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

    // INVITE - Invite a player by username or wallet_short
    if (action === "invite") {
      const { searchQuery } = body;

      if (!searchQuery || typeof searchQuery !== "string" || searchQuery.trim().length < 2) {
        return new Response(JSON.stringify({ error: "Search query too short" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify user is in an alliance
      const { data: membership } = await supabase
        .from("alliance_members")
        .select("alliance_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (!membership) {
        return new Response(JSON.stringify({ error: "Not in an alliance" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const query = searchQuery.trim();

      // Validate input contains only safe characters
      if (!/^[\p{L}\p{N} .\-_]+$/u.test(query)) {
        return new Response(JSON.stringify({ error: "Invalid search characters" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Escape SQL wildcard characters to prevent injection
      const escaped = query.replace(/[%_\\]/g, '\\$&');

      // Search by display_name or wallet_address (partial match)
      const { data: foundUsers } = await supabase
        .from("users")
        .select("id, display_name, level, wallet_address")
        .or(`display_name.ilike.%${escaped}%,wallet_address.ilike.%${escaped}%`)
        .neq("id", userId)
        .limit(10);

      if (!foundUsers || foundUsers.length === 0) {
        return new Response(JSON.stringify({ error: "No users found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Return found users for selection
      return new Response(JSON.stringify({
        users: foundUsers.map(u => ({
          id: u.id,
          displayName: u.display_name,
          walletShort: u.wallet_address ? `${u.wallet_address.slice(0, 4)}...${u.wallet_address.slice(-4)}` : null,
          level: u.level || 1,
        })),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SEND-INVITE - Actually send an invite to a specific user
    if (action === "send-invite") {
      const { targetUserId } = body;

      if (!targetUserId) {
        return new Response(JSON.stringify({ error: "Target user required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify user is in an alliance
      const { data: membership } = await supabase
        .from("alliance_members")
        .select("alliance_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (!membership) {
        return new Response(JSON.stringify({ error: "Not in an alliance" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify target exists
      const { data: targetUser } = await supabase
        .from("users")
        .select("id, display_name")
        .eq("id", targetUserId)
        .maybeSingle();

      if (!targetUser) {
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if target is already in an alliance
      const { data: targetMembership } = await supabase
        .from("alliance_members")
        .select("id")
        .eq("user_id", targetUserId)
        .maybeSingle();

      if (targetMembership) {
        return new Response(JSON.stringify({ error: "User is already in an alliance" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if already invited (pending)
      const { data: existingInvite } = await supabase
        .from("alliance_invites")
        .select("id")
        .eq("alliance_id", membership.alliance_id)
        .eq("invited_user_id", targetUserId)
        .eq("status", "PENDING")
        .maybeSingle();

      if (existingInvite) {
        return new Response(JSON.stringify({ error: "User already has a pending invite" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create invite
      const { data: newInvite, error: inviteError } = await supabase
        .from("alliance_invites")
        .insert({
          alliance_id: membership.alliance_id,
          invited_user_id: targetUserId,
          invited_by_user_id: userId,
          status: "PENDING",
        })
        .select("id")
        .single();

      if (inviteError) {
        console.error("[alliance-manage] Invite error:", inviteError);
        return new Response(JSON.stringify({ error: "Failed to send invite" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get alliance details for notification
      const { data: alliance } = await supabase
        .from("alliances")
        .select("name, tag")
        .eq("id", membership.alliance_id)
        .single();

      // Create notification for invited user
      if (alliance) {
        await supabase.from("notifications").insert({
          user_id: targetUserId,
          type: "ALLIANCE_INVITE",
          title: "Alliance Invite",
          body: `[${alliance.tag}] ${alliance.name} invited you to join!`,
          meta: { alliance_id: membership.alliance_id, invite_id: newInvite.id, inviter_id: userId }
        });
      }

      console.log(`[alliance-manage] User ${userId} invited ${targetUserId}`);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET-INVITES - Get pending invites for current user
    if (action === "get-invites") {
      const { data: invites } = await supabase
        .from("alliance_invites")
        .select(`
          id,
          alliance_id,
          invited_by_user_id,
          created_at,
          alliances:alliance_id (
            name,
            tag
          ),
          inviter:invited_by_user_id (
            display_name
          )
        `)
        .eq("invited_user_id", userId)
        .eq("status", "PENDING")
        .order("created_at", { ascending: false });

      return new Response(JSON.stringify({
        invites: invites?.map(inv => ({
          id: inv.id,
          allianceId: inv.alliance_id,
          allianceName: (inv.alliances as any)?.name,
          allianceTag: (inv.alliances as any)?.tag,
          invitedByName: (inv.inviter as any)?.display_name || "Unknown",
          createdAt: inv.created_at,
        })) || [],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACCEPT-INVITE - Accept an alliance invite
    if (action === "accept-invite") {
      const { inviteId } = body;

      if (!inviteId) {
        return new Response(JSON.stringify({ error: "Invite ID required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get the invite
      const { data: invite } = await supabase
        .from("alliance_invites")
        .select("id, alliance_id, status")
        .eq("id", inviteId)
        .eq("invited_user_id", userId)
        .maybeSingle();

      if (!invite) {
        return new Response(JSON.stringify({ error: "Invite not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (invite.status !== "PENDING") {
        return new Response(JSON.stringify({ error: "Invite already processed" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if already in alliance
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

      // Get alliance tag
      const { data: alliance } = await supabase
        .from("alliances")
        .select("tag")
        .eq("id", invite.alliance_id)
        .single();

      // Add to alliance
      await supabase.from("alliance_members").insert({
        user_id: userId,
        alliance_id: invite.alliance_id,
        role: "member",
      });

      // Update user's alliance_tag
      await supabase
        .from("users")
        .update({ alliance_tag: alliance?.tag })
        .eq("id", userId);

      // Mark invite as accepted
      await supabase
        .from("alliance_invites")
        .update({ status: "ACCEPTED" })
        .eq("id", inviteId);

      // Decline all other pending invites for this user
      await supabase
        .from("alliance_invites")
        .update({ status: "DECLINED" })
        .eq("invited_user_id", userId)
        .eq("status", "PENDING");

      console.log(`[alliance-manage] User ${userId} accepted invite ${inviteId}`);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DECLINE-INVITE - Decline an alliance invite
    if (action === "decline-invite") {
      const { inviteId } = body;

      if (!inviteId) {
        return new Response(JSON.stringify({ error: "Invite ID required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: invite } = await supabase
        .from("alliance_invites")
        .select("id, status")
        .eq("id", inviteId)
        .eq("invited_user_id", userId)
        .maybeSingle();

      if (!invite) {
        return new Response(JSON.stringify({ error: "Invite not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (invite.status !== "PENDING") {
        return new Response(JSON.stringify({ error: "Invite already processed" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase
        .from("alliance_invites")
        .update({ status: "DECLINED" })
        .eq("id", inviteId);

      console.log(`[alliance-manage] User ${userId} declined invite ${inviteId}`);

      return new Response(JSON.stringify({ success: true }), {
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

      await supabase
        .from("alliance_members")
        .delete()
        .eq("user_id", userId);

      await supabase
        .from("users")
        .update({ alliance_tag: null })
        .eq("id", userId);

      // If last member, delete alliance and all pending invites
      if ((count || 0) <= 1) {
        await supabase
          .from("alliance_invites")
          .delete()
          .eq("alliance_id", membership.alliance_id);
          
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