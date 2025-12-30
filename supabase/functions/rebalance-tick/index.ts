import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Constants
const REBALANCE_DURATION_MS = 3 * 24 * 60 * 60 * 1000; // 3 days in ms
const TICK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours in ms
const TOTAL_TICKS = 12; // 12 ticks over 3 days

interface UserStakeData {
  id: string;
  pe_total_pe: number;
  owner_health_multiplier: number;
  rebalance_active: boolean;
  rebalance_started_at: string | null;
  rebalance_ends_at: string | null;
  rebalance_target_multiplier: number | null;
  total_stake: number;
}

/**
 * Calculate the current multiplier based on linear interpolation.
 * Goes from 1.0 at start to target_multiplier at end over 3 days.
 */
function calculateCurrentMultiplier(
  startedAt: Date,
  endsAt: Date,
  targetMultiplier: number,
  now: Date
): number {
  const totalDuration = endsAt.getTime() - startedAt.getTime();
  const elapsed = now.getTime() - startedAt.getTime();
  
  if (elapsed >= totalDuration) {
    return targetMultiplier;
  }
  
  const progress = elapsed / totalDuration;
  // Linear interpolation from 1.0 to target
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

    // Step 1: Get all users with their total stakes
    // We need to identify who should start/stop/continue rebalancing
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, pe_total_pe, owner_health_multiplier, rebalance_active, rebalance_started_at, rebalance_ends_at, rebalance_target_multiplier");

    if (usersError) {
      console.error("[rebalance-tick] Users fetch error:", usersError);
      return new Response(JSON.stringify({ ok: false, error: "DB_ERROR" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: Get total stakes per user (sum of owner_stake_pe for owned pixels)
    const { data: stakes, error: stakesError } = await supabase
      .from("pixels")
      .select("owner_user_id, owner_stake_pe");

    if (stakesError) {
      console.error("[rebalance-tick] Stakes fetch error:", stakesError);
      return new Response(JSON.stringify({ ok: false, error: "DB_ERROR" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Aggregate stakes by user
    const stakesByUser = new Map<string, number>();
    (stakes || []).forEach(p => {
      if (p.owner_user_id) {
        const current = stakesByUser.get(p.owner_user_id) || 0;
        stakesByUser.set(p.owner_user_id, current + (p.owner_stake_pe || 0));
      }
    });

    let startedCount = 0;
    let stoppedCount = 0;
    let updatedCount = 0;

    // Step 3: Process each user
    for (const user of users || []) {
      const totalStake = stakesByUser.get(user.id) || 0;
      const isUnderCollateralized = totalStake > user.pe_total_pe;

      if (user.rebalance_active) {
        // User is currently in rebalance mode

        // Check if user has re-collateralized
        if (!isUnderCollateralized) {
          // Stop rebalance immediately, restore multiplier to 1
          const { error } = await supabase
            .from("users")
            .update({
              rebalance_active: false,
              owner_health_multiplier: 1,
              rebalance_started_at: null,
              rebalance_ends_at: null,
              rebalance_target_multiplier: null,
            })
            .eq("id", user.id);

          if (!error) {
            stoppedCount++;
            console.log(`[rebalance-tick] Stopped rebalance for user ${user.id} (re-collateralized)`);
          }
          continue;
        }

        // Check if rebalance period has ended
        if (user.rebalance_ends_at && new Date(user.rebalance_ends_at) <= now) {
          // Set final multiplier
          const { error } = await supabase
            .from("users")
            .update({
              owner_health_multiplier: user.rebalance_target_multiplier || 0,
            })
            .eq("id", user.id);

          if (!error) {
            updatedCount++;
            console.log(`[rebalance-tick] Final multiplier set for user ${user.id}: ${user.rebalance_target_multiplier}`);
          }
          continue;
        }

        // Update multiplier based on time progress
        if (user.rebalance_started_at && user.rebalance_ends_at && user.rebalance_target_multiplier !== null) {
          const newMultiplier = calculateCurrentMultiplier(
            new Date(user.rebalance_started_at),
            new Date(user.rebalance_ends_at),
            user.rebalance_target_multiplier,
            now
          );

          // Only update if significantly different (avoid unnecessary writes)
          if (Math.abs(newMultiplier - user.owner_health_multiplier) > 0.001) {
            const { error } = await supabase
              .from("users")
              .update({
                owner_health_multiplier: Math.max(0, Math.min(1, newMultiplier)),
              })
              .eq("id", user.id);

            if (!error) {
              updatedCount++;
              console.log(`[rebalance-tick] Updated multiplier for user ${user.id}: ${user.owner_health_multiplier} -> ${newMultiplier.toFixed(4)}`);
            }
          }
        }
      } else {
        // User is not in rebalance mode

        // Check if user should start rebalancing
        if (isUnderCollateralized && totalStake > 0) {
          const targetMultiplier = Math.max(0, Math.min(1, user.pe_total_pe / totalStake));
          const endsAt = new Date(now.getTime() + REBALANCE_DURATION_MS);

          const { error } = await supabase
            .from("users")
            .update({
              rebalance_active: true,
              rebalance_started_at: now.toISOString(),
              rebalance_ends_at: endsAt.toISOString(),
              rebalance_target_multiplier: targetMultiplier,
              // Multiplier starts at 1, will decrease over time
              owner_health_multiplier: 1,
            })
            .eq("id", user.id);

          if (!error) {
            startedCount++;
            console.log(`[rebalance-tick] Started rebalance for user ${user.id}: stake=${totalStake}, pe=${user.pe_total_pe}, target=${targetMultiplier.toFixed(4)}`);
          }
        }
      }
    }

    const elapsed = Date.now() - startTime;
    console.log(`[rebalance-tick] Complete in ${elapsed}ms: started=${startedCount}, stopped=${stoppedCount}, updated=${updatedCount}`);

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
