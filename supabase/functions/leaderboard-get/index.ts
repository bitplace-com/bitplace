import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 10000;
const RATE_LIMIT_MAX_REQUESTS = 5;

type MacroScope = "players" | "countries" | "alliances";
type SubCategory = "painters" | "investors" | "defenders" | "attackers";
type Period = "today" | "week" | "month" | "all";

interface RequestBody {
  scope: MacroScope;
  subCategory?: SubCategory;
  period: Period;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("cf-connecting-ip") || "unknown";
    const now = Date.now();
    const rateLimit = rateLimitMap.get(clientIp);
    
    if (rateLimit && now < rateLimit.resetAt) {
      if (rateLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
        const retryAfter = Math.ceil((rateLimit.resetAt - now) / 1000);
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { 
          status: 429, 
          headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": retryAfter.toString() } 
        });
      }
      rateLimit.count++;
    } else {
      rateLimitMap.set(clientIp, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: RequestBody = await req.json();
    const { scope, subCategory = "painters", period } = body;
    console.log(`[leaderboard-get] scope=${scope}, sub=${subCategory}, period=${period}`);

    if (!["players", "countries", "alliances"].includes(scope)) {
      return new Response(JSON.stringify({ error: "Invalid scope" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!["painters", "investors", "defenders", "attackers"].includes(subCategory)) {
      return new Response(JSON.stringify({ error: "Invalid subCategory" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!["today", "week", "month", "all"].includes(period)) {
      return new Response(JSON.stringify({ error: "Invalid period" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const getTimeFilter = (): string | null => {
      const now = new Date();
      switch (period) {
        case "today": return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
        case "week": return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        case "month": return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        case "all": return null;
      }
    };

    let data: unknown[] = [];

    // ─── PE-based sub-categories (investors/defenders/attackers) ───
    if (subCategory !== "painters") {
      const rpcName = subCategory === "investors" 
        ? "leaderboard_top_investors" 
        : subCategory === "defenders" 
          ? "leaderboard_top_defenders" 
          : "leaderboard_top_attackers";

      const { data: rpcData, error: rpcError } = await supabase.rpc(rpcName, { lim: 200 });
      if (rpcError) throw rpcError;

      // deno-lint-ignore no-explicit-any
      const entries = (rpcData || []).map((r: any) => ({
        id: r.user_id,
        displayName: r.display_name,
        countryCode: r.country_code,
        allianceTag: r.alliance_tag,
        totalPe: Number(r.total_pe),
        avatarUrl: r.avatar_url,
        bio: r.bio,
        socialX: r.social_x,
        socialInstagram: r.social_instagram,
        socialWebsite: r.social_website,
        walletAddress: r.wallet_address,
      }));

      if (scope === "players") {
        data = entries.slice(0, 50).map((e: { id: string; displayName: string; countryCode: string; allianceTag: string; totalPe: number; avatarUrl: string; bio: string; socialX: string; socialInstagram: string; socialWebsite: string; walletAddress: string }, i: number) => ({ ...e, rank: i + 1 }));
      } else if (scope === "countries") {
        // Aggregate by country
        const countryMap = new Map<string, { totalPe: number; players: Set<string> }>();
        for (const e of entries) {
          if (!e.countryCode) continue;
          const cur = countryMap.get(e.countryCode) || { totalPe: 0, players: new Set() };
          cur.totalPe += e.totalPe;
          cur.players.add(e.id);
          countryMap.set(e.countryCode, cur);
        }
        data = Array.from(countryMap.entries())
          .sort((a, b) => b[1].totalPe - a[1].totalPe)
          .slice(0, 50)
          .map(([cc, stats], i) => ({
            rank: i + 1,
            countryCode: cc,
            playerCount: stats.players.size,
            totalPe: stats.totalPe,
          }));
      } else if (scope === "alliances") {
        // Aggregate by alliance
        const { data: alliances } = await supabase.from("alliances").select("tag, name");
        const allianceNameMap = new Map((alliances || []).map((a: { tag: string; name: string }) => [a.tag, a.name]));

        const allianceMap = new Map<string, { totalPe: number; players: Set<string> }>();
        for (const e of entries) {
          if (!e.allianceTag) continue;
          const cur = allianceMap.get(e.allianceTag) || { totalPe: 0, players: new Set() };
          cur.totalPe += e.totalPe;
          cur.players.add(e.id);
          allianceMap.set(e.allianceTag, cur);
        }
        data = Array.from(allianceMap.entries())
          .sort((a, b) => b[1].totalPe - a[1].totalPe)
          .slice(0, 50)
          .map(([tag, stats], i) => ({
            rank: i + 1,
            allianceTag: tag,
            allianceName: allianceNameMap.get(tag) || tag,
            playerCount: stats.players.size,
            totalPe: stats.totalPe,
          }));
      }
    } else {
      // ─── Painters sub-category (pixel count, supports time period) ───
      const timeFilter = getTimeFilter();

      if (scope === "players") {
        let query = supabase.from("paint_events").select("user_id, pixel_count, action_type, created_at").in("action_type", ["PAINT", "ERASE"]);
        if (timeFilter) query = query.gte("created_at", timeFilter);
        const { data: events, error: eventsError } = await query;
        if (eventsError) throw eventsError;

        const userTotals = new Map<string, number>();
        for (const event of events || []) {
          if (event.user_id) {
            const delta = event.action_type === "ERASE" ? -(event.pixel_count || 0) : (event.pixel_count || 0);
            userTotals.set(event.user_id, (userTotals.get(event.user_id) || 0) + delta);
          }
        }
        for (const [uid, val] of userTotals) {
          if (val < 0) userTotals.set(uid, 0);
        }

        const allUserIds = Array.from(userTotals.keys());
        if (allUserIds.length > 0) {
          const { data: users, error: usersError } = await supabase
            .from("users")
            .select("id, display_name, country_code, alliance_tag, avatar_url, bio, social_x, social_instagram, social_website, wallet_address")
            .in("id", allUserIds);
          if (usersError) throw usersError;

          // deno-lint-ignore no-explicit-any
          const userMap = new Map((users || []).map((u: any) => [u.id, u]));
          
          const entries = Array.from(userTotals.entries()).map(([userId, totalPixels]) => {
            const user = userMap.get(userId);
            return {
              id: userId,
              displayName: user?.display_name,
              countryCode: user?.country_code,
              allianceTag: user?.alliance_tag,
              totalPixels,
              avatarUrl: user?.avatar_url || null,
              bio: user?.bio || null,
              socialX: user?.social_x || null,
              socialInstagram: user?.social_instagram || null,
              socialWebsite: user?.social_website || null,
              walletAddress: user?.wallet_address || null,
            };
          });

          entries.sort((a, b) => b.totalPixels - a.totalPixels);
          data = entries.slice(0, 50).map((e, i) => ({ ...e, rank: i + 1 }));
        }
      } else if (scope === "countries") {
        let query = supabase.from("paint_events").select("user_id, pixel_count, action_type, created_at").in("action_type", ["PAINT", "ERASE"]);
        if (timeFilter) query = query.gte("created_at", timeFilter);
        const { data: events, error: eventsError } = await query;
        if (eventsError) throw eventsError;

        const { data: users, error: usersError } = await supabase
          .from("users")
          .select("id, country_code")
          .not("country_code", "is", null);
        if (usersError) throw usersError;

        // deno-lint-ignore no-explicit-any
        const userCountryMap = new Map((users || []).map((u: any) => [u.id, u.country_code]));

        const countryTotals = new Map<string, { pixels: number; players: Set<string> }>();
        for (const event of events || []) {
          if (event.user_id) {
            const countryCode = userCountryMap.get(event.user_id);
            if (countryCode) {
              const current = countryTotals.get(countryCode) || { pixels: 0, players: new Set() };
              const delta = event.action_type === "ERASE" ? -(event.pixel_count || 0) : (event.pixel_count || 0);
              current.pixels += delta;
              current.players.add(event.user_id);
              countryTotals.set(countryCode, current);
            }
          }
        }

        data = Array.from(countryTotals.entries())
          .sort((a, b) => b[1].pixels - a[1].pixels)
          .slice(0, 50)
          .map(([countryCode, stats], index) => ({
            rank: index + 1,
            countryCode,
            playerCount: stats.players.size,
            totalPixels: stats.pixels,
          }));
      } else if (scope === "alliances") {
        let query = supabase.from("paint_events").select("user_id, pixel_count, action_type, created_at").in("action_type", ["PAINT", "ERASE"]);
        if (timeFilter) query = query.gte("created_at", timeFilter);
        const { data: events, error: eventsError } = await query;
        if (eventsError) throw eventsError;

        const { data: users, error: usersError } = await supabase
          .from("users")
          .select("id, alliance_tag")
          .not("alliance_tag", "is", null);
        if (usersError) throw usersError;

        // deno-lint-ignore no-explicit-any
        const userAllianceMap = new Map((users || []).map((u: any) => [u.id, u.alliance_tag]));

        const { data: alliances, error: alliancesError } = await supabase
          .from("alliances")
          .select("tag, name");
        if (alliancesError) throw alliancesError;

        const allianceNameMap = new Map((alliances || []).map((a: { tag: string; name: string }) => [a.tag, a.name]));

        const allianceTotals = new Map<string, { pixels: number; players: Set<string> }>();
        for (const event of events || []) {
          if (event.user_id) {
            const allianceTag = userAllianceMap.get(event.user_id);
            if (allianceTag) {
              const current = allianceTotals.get(allianceTag) || { pixels: 0, players: new Set() };
              const delta = event.action_type === "ERASE" ? -(event.pixel_count || 0) : (event.pixel_count || 0);
              current.pixels += delta;
              current.players.add(event.user_id);
              allianceTotals.set(allianceTag, current);
            }
          }
        }

        data = Array.from(allianceTotals.entries())
          .sort((a, b) => b[1].pixels - a[1].pixels)
          .slice(0, 50)
          .map(([tag, stats], index) => ({
            rank: index + 1,
            allianceTag: tag,
            allianceName: allianceNameMap.get(tag) || tag,
            playerCount: stats.players.size,
            totalPixels: stats.pixels,
          }));
      }
    }

    console.log(`[leaderboard-get] Returning ${data.length} entries`);
    return new Response(JSON.stringify({ data }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[leaderboard-get] Error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
