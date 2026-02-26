import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// $BIT token configuration
const BIT_TOKEN_MINT = "6az8wE4Gmns7bPLwfeR9Ed9pnGjqN5Cv9FJ3vs4Cpump";
const BIT_DECIMALS = 6;
const RPC_MAINNET = "https://api.mainnet-beta.solana.com";
const PE_PER_USD = 1000;

// Max users to process per invocation to avoid Solana RPC rate limits
const BATCH_SIZE = 50;

// In-memory price cache (per invocation)
let cachedPrice: number | null = null;

async function fetchBitBalance(walletAddress: string): Promise<number> {
  try {
    const response = await fetch(RPC_MAINNET, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTokenAccountsByOwner",
        params: [
          walletAddress,
          { mint: BIT_TOKEN_MINT },
          { encoding: "jsonParsed" },
        ],
      }),
    });

    if (!response.ok) return 0;
    const data = await response.json();
    if (data.error) return 0;

    const accounts = data.result?.value || [];
    if (accounts.length === 0) return 0;

    let totalRaw = 0;
    for (const account of accounts) {
      const info = account.account?.data?.parsed?.info;
      if (info) totalRaw += Number(info.tokenAmount?.amount || 0);
    }
    return totalRaw / Math.pow(10, BIT_DECIMALS);
  } catch {
    return 0;
  }
}

async function fetchBitPrice(): Promise<number> {
  if (cachedPrice !== null) return cachedPrice;

  try {
    const response = await fetch(
      `https://api.dexscreener.com/token-pairs/v1/solana/${BIT_TOKEN_MINT}`,
      { headers: { Accept: "application/json" } }
    );
    if (!response.ok) return 0;
    const data = await response.json();
    const pairs = Array.isArray(data) ? data : data.pairs || [];
    const price = parseFloat(pairs[0]?.priceUsd ?? "0");
    if (price > 0) cachedPrice = price;
    return price;
  } catch {
    return 0;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch wallet users with active stake (pe_used_pe > 0)
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, wallet_address, pe_total_pe, pe_used_pe, rebalance_active, rebalance_started_at, rebalance_ends_at, rebalance_target_multiplier")
      .eq("auth_provider", "wallet")
      .gt("pe_used_pe", 0)
      .not("wallet_address", "is", null)
      .order("last_energy_sync_at", { ascending: true, nullsFirst: true })
      .limit(BATCH_SIZE);

    if (usersError) throw usersError;

    if (!users || users.length === 0) {
      console.log("[balance-check-all] No wallet users with active stake to check");
      return new Response(JSON.stringify({ ok: true, checked: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Also check 'both' auth provider users
    const { data: bothUsers } = await supabase
      .from("users")
      .select("id, wallet_address, pe_total_pe, pe_used_pe, rebalance_active, rebalance_started_at, rebalance_ends_at, rebalance_target_multiplier")
      .eq("auth_provider", "both")
      .gt("pe_used_pe", 0)
      .not("wallet_address", "is", null)
      .order("last_energy_sync_at", { ascending: true, nullsFirst: true })
      .limit(BATCH_SIZE);

    const allUsers = [...users, ...(bothUsers || [])].slice(0, BATCH_SIZE);
    console.log(`[balance-check-all] Checking ${allUsers.length} users`);

    const bitPrice = await fetchBitPrice();
    if (bitPrice <= 0) {
      console.error("[balance-check-all] Could not fetch $BIT price, aborting");
      return new Response(JSON.stringify({ ok: false, error: "Price unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let checked = 0;
    let rebalancesStarted = 0;
    let rebalancesStopped = 0;
    let contributionsPurged = 0;

    for (const user of allUsers) {
      const bitBalance = await fetchBitBalance(user.wallet_address);
      const walletUsd = bitBalance * bitPrice;
      const peTotal = Math.floor(walletUsd * PE_PER_USD);

      // Get actual PE usage breakdown
      const { data: contribs } = await supabase
        .from("pixel_contributions")
        .select("amount_pe")
        .eq("user_id", user.id);

      const contribUsed = (contribs || []).reduce(
        (sum: number, c: { amount_pe: number }) => sum + Number(c.amount_pe || 0), 0
      );
      const peUsed = Number(user.pe_used_pe) || 0;
      const ownerUsed = peUsed - contribUsed;

      // Update pe_total_pe and balance info
      const syncAt = new Date().toISOString();
      // deno-lint-ignore no-explicit-any
      const updateFields: Record<string, any> = {
        native_balance: bitBalance,
        usd_price: bitPrice,
        wallet_usd: walletUsd,
        pe_total_pe: peTotal,
        last_energy_sync_at: syncAt,
      };

      // Check collateralization
      if (peTotal < ownerUsed + contribUsed) {
        console.log(`[balance-check-all] User ${user.id} under-collateralized: peTotal=${peTotal} < used=${ownerUsed + contribUsed}, purging contributions`);
        await supabase.from("pixel_contributions").delete().eq("user_id", user.id);
        contributionsPurged++;
      }

      const isOwnerUnderCollateralized = peTotal < ownerUsed;

      if (isOwnerUnderCollateralized && ownerUsed > 0) {
        if (!user.rebalance_active) {
          const targetMultiplier = Math.max(0, peTotal / ownerUsed);
          const nowDate = new Date();
          const endsAt = new Date(nowDate.getTime() + 3 * 24 * 60 * 60 * 1000);

          updateFields.rebalance_active = true;
          updateFields.rebalance_started_at = nowDate.toISOString();
          updateFields.rebalance_ends_at = endsAt.toISOString();
          updateFields.rebalance_target_multiplier = targetMultiplier;
          updateFields.owner_health_multiplier = 1;

          console.log(`[balance-check-all] Started rebalance for ${user.id}: target=${targetMultiplier.toFixed(4)}`);
          rebalancesStarted++;
        }
      } else if (user.rebalance_active) {
        updateFields.rebalance_active = false;
        updateFields.owner_health_multiplier = 1;
        updateFields.rebalance_started_at = null;
        updateFields.rebalance_ends_at = null;
        updateFields.rebalance_target_multiplier = null;

        console.log(`[balance-check-all] Stopped rebalance for ${user.id} (re-collateralized)`);
        rebalancesStopped++;
      }

      await supabase.from("users").update(updateFields).eq("id", user.id);
      checked++;

      // Small delay between RPC calls to avoid rate limiting
      if (checked < allUsers.length) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    const summary = {
      ok: true,
      checked,
      rebalancesStarted,
      rebalancesStopped,
      contributionsPurged,
      bitPrice,
    };
    console.log(`[balance-check-all] Done:`, JSON.stringify(summary));

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[balance-check-all] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
