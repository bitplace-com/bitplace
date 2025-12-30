import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Scheduled function to clean up under-collateralized DEF/ATK contributions.
 * DEF/ATK have NO decay - they disappear immediately when collateral is insufficient.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("[contribution-cleanup] Starting cleanup check...");

    // Find all users who have contributions
    const { data: contributorAggregates, error: aggError } = await supabase
      .from("pixel_contributions")
      .select("user_id, amount_pe");

    if (aggError) {
      console.error("[contribution-cleanup] Failed to fetch contributions:", aggError);
      return new Response(JSON.stringify({ ok: false, error: "DB_ERROR" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group contributions by user
    const userContribTotals = new Map<string, number>();
    (contributorAggregates || []).forEach(c => {
      const current = userContribTotals.get(c.user_id) || 0;
      userContribTotals.set(c.user_id, current + c.amount_pe);
    });

    const userIds = [...userContribTotals.keys()];
    
    if (userIds.length === 0) {
      console.log("[contribution-cleanup] No contributions found, nothing to clean up");
      return new Response(JSON.stringify({ ok: true, cleaned: 0, usersAffected: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch PE totals for all contributors
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, pe_total_pe")
      .in("id", userIds);

    if (usersError) {
      console.error("[contribution-cleanup] Failed to fetch users:", usersError);
      return new Response(JSON.stringify({ ok: false, error: "DB_ERROR" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find under-collateralized users
    const underCollateralizedUsers: string[] = [];
    (users || []).forEach(user => {
      const contribTotal = userContribTotals.get(user.id) || 0;
      if (user.pe_total_pe < contribTotal) {
        underCollateralizedUsers.push(user.id);
        console.log(`[contribution-cleanup] User ${user.id} under-collateralized: PE=${user.pe_total_pe}, contributions=${contribTotal}`);
      }
    });

    if (underCollateralizedUsers.length === 0) {
      console.log("[contribution-cleanup] No under-collateralized contributors found");
      return new Response(JSON.stringify({ ok: true, cleaned: 0, usersAffected: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete all contributions for under-collateralized users
    let totalDeleted = 0;
    for (const userId of underCollateralizedUsers) {
      const { data: deleted, error: delError } = await supabase
        .from("pixel_contributions")
        .delete()
        .eq("user_id", userId)
        .select("id");

      if (delError) {
        console.error(`[contribution-cleanup] Failed to delete contributions for user ${userId}:`, delError);
      } else {
        const count = deleted?.length || 0;
        totalDeleted += count;
        console.log(`[contribution-cleanup] Deleted ${count} contributions for user ${userId}`);
      }
    }

    console.log(`[contribution-cleanup] Cleanup complete: ${totalDeleted} contributions removed from ${underCollateralizedUsers.length} users`);

    return new Response(JSON.stringify({
      ok: true,
      cleaned: totalDeleted,
      usersAffected: underCollateralizedUsers.length,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[contribution-cleanup] Error:", err);
    return new Response(JSON.stringify({ ok: false, error: "INTERNAL_ERROR", message: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
