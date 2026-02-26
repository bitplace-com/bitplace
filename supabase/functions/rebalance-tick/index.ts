import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Constants
const GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const DECAY_DURATION_MS = 72 * 60 * 60 * 1000; // 72 hours

/**
 * Linear interpolation from 1.0 to targetMultiplier over the decay period.
 */
function calculateCurrentMultiplier(
  startedAt: Date,
  endsAt: Date,
  targetMultiplier: number,
  now: Date
): number {
  const totalDuration = endsAt.getTime() - startedAt.getTime();
  const elapsed = now.getTime() - startedAt.getTime();

  if (elapsed >= totalDuration) return targetMultiplier;

  const progress = elapsed / totalDuration;
  return 1 - (1 - targetMultiplier) * progress;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log("[rebalance-tick] Starting tick at", new Date().toISOString());

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    const graceDeadline = new Date(now.getTime() - GRACE_PERIOD_MS).toISOString();

    let startedCount = 0;
    let stoppedCount = 0;
    let updatedCount = 0;

    // ── Part 1: Process users already in rebalance ──
    const { data: activeUsers, error: activeError } = await supabase
      .from("users")
      .select("id, owner_health_multiplier, rebalance_started_at, rebalance_ends_at, rebalance_target_multiplier")
      .eq("rebalance_active", true);

    if (activeError) {
      console.error("[rebalance-tick] Active users fetch error:", activeError);
      return new Response(JSON.stringify({ ok: false, error: "DB_ERROR" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (const user of activeUsers || []) {
      // Check if decay period has ended
      if (user.rebalance_ends_at && new Date(user.rebalance_ends_at) <= now) {
        await supabase
          .from("users")
          .update({ owner_health_multiplier: user.rebalance_target_multiplier || 0 })
          .eq("id", user.id);
        updatedCount++;
        console.log(`[rebalance-tick] Final multiplier for ${user.id}: ${user.rebalance_target_multiplier}`);
        continue;
      }

      // Update multiplier via linear interpolation
      if (user.rebalance_started_at && user.rebalance_ends_at && user.rebalance_target_multiplier !== null) {
        const newMultiplier = calculateCurrentMultiplier(
          new Date(user.rebalance_started_at),
          new Date(user.rebalance_ends_at),
          user.rebalance_target_multiplier,
          now
        );

        if (Math.abs(newMultiplier - user.owner_health_multiplier) > 0.001) {
          await supabase
            .from("users")
            .update({ owner_health_multiplier: Math.max(0, Math.min(1, newMultiplier)) })
            .eq("id", user.id);
          updatedCount++;
          console.log(`[rebalance-tick] Updated ${user.id}: ${user.owner_health_multiplier} -> ${newMultiplier.toFixed(4)}`);
        }
      }
    }

    // ── Part 2: Start rebalance for users whose grace period expired ──
    const { data: expiredUsers, error: expiredError } = await supabase
      .from("users")
      .select("id, pe_used_pe")
      .eq("rebalance_active", false)
      .gt("pe_used_pe", 0)
      .in("auth_provider", ["wallet", "both"])
      .lt("last_balance_verified_at", graceDeadline);

    if (expiredError) {
      console.error("[rebalance-tick] Expired users fetch error:", expiredError);
    }

    for (const user of expiredUsers || []) {
      // Get total staked PE via RPC function (no pixel loading)
      const { data: stakeData, error: stakeError } = await supabase
        .rpc("get_user_total_staked_pe", { uid: user.id });

      if (stakeError || !stakeData || stakeData.length === 0) {
        console.error(`[rebalance-tick] Stake fetch error for ${user.id}:`, stakeError);
        continue;
      }

      const pixelStakeTotal = Number(stakeData[0].pixel_stake_total) || 0;
      if (pixelStakeTotal <= 0) continue;

      // Count owned pixels to calculate floor target
      const { count: numPixels } = await supabase
        .from("pixels")
        .select("*", { count: "exact", head: true })
        .eq("owner_user_id", user.id);

      if (!numPixels || numPixels <= 0) continue;

      // Target multiplier: brings each pixel to floor of 1 PE
      // If average stake = pixelStakeTotal/numPixels, target = 1/(avg) = numPixels/pixelStakeTotal
      const targetMultiplier = Math.max(0, Math.min(1, numPixels / pixelStakeTotal));
      const endsAt = new Date(now.getTime() + DECAY_DURATION_MS);

      await supabase
        .from("users")
        .update({
          rebalance_active: true,
          rebalance_started_at: now.toISOString(),
          rebalance_ends_at: endsAt.toISOString(),
          rebalance_target_multiplier: targetMultiplier,
          owner_health_multiplier: 1,
        })
        .eq("id", user.id);

      startedCount++;
      console.log(`[rebalance-tick] Started decay for ${user.id}: pixels=${numPixels}, stake=${pixelStakeTotal}, target=${targetMultiplier.toFixed(4)}`);
    }

    const elapsed = Date.now() - startTime;
    console.log(`[rebalance-tick] Done in ${elapsed}ms: started=${startedCount}, stopped=${stoppedCount}, updated=${updatedCount}`);

    return new Response(JSON.stringify({
      ok: true,
      started: startedCount,
      stopped: stoppedCount,
      updated: updatedCount,
      elapsed,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[rebalance-tick] Error:", err);
    return new Response(JSON.stringify({ ok: false, error: "INTERNAL_ERROR", message: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
