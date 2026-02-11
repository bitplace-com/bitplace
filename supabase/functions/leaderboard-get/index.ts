import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 10000;
const RATE_LIMIT_MAX_REQUESTS = 5;

type Scope = "players" | "countries" | "alliances";
type Period = "today" | "week" | "month" | "all";
type Metric = "pixels" | "pe_staked";

interface RequestBody {
  scope: Scope;
  period: Period;
  metric?: Metric;
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

    const { scope, period, metric = "pixels" }: RequestBody = await req.json();
    console.log(`[leaderboard-get] Fetching ${scope} for ${period}, metric=${metric}`);

    if (!["players", "countries", "alliances"].includes(scope)) {
      return new Response(JSON.stringify({ error: "Invalid scope" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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

    const timeFilter = getTimeFilter();
    let data: unknown[] = [];

    if (scope === "players") {
      let query = supabase.from("paint_events").select("user_id, pixel_count, created_at");
      if (timeFilter) query = query.gte("created_at", timeFilter);
      const { data: events, error: eventsError } = await query;
      if (eventsError) throw eventsError;

      const userTotals = new Map<string, number>();
      for (const event of events || []) {
        if (event.user_id) {
          userTotals.set(event.user_id, (userTotals.get(event.user_id) || 0) + (event.pixel_count || 0));
        }
      }

      // Get all user IDs from events
      const allUserIds = Array.from(userTotals.keys());
      if (allUserIds.length > 0) {
        const { data: users, error: usersError } = await supabase
          .from("users")
          .select("id, display_name, country_code, alliance_tag, avatar_url, bio, social_x, social_instagram, social_website, pe_used_pe, pixels_painted_total")
          .in("id", allUserIds);
        if (usersError) throw usersError;

        const userMap = new Map((users || []).map((u) => [u.id, u]));
        
        // Build entries with both metrics
        const entries = Array.from(userTotals.entries()).map(([userId, totalPixels]) => {
          const user = userMap.get(userId);
          return {
            id: userId,
            displayName: user?.display_name,
            countryCode: user?.country_code,
            allianceTag: user?.alliance_tag,
            totalPixels,
            totalPeStaked: Number(user?.pe_used_pe || 0),
            avatarUrl: user?.avatar_url || null,
            bio: user?.bio || null,
            socialX: user?.social_x || null,
            socialInstagram: user?.social_instagram || null,
            socialWebsite: user?.social_website || null,
          };
        });

        // Sort by chosen metric
        const sortKey = metric === "pe_staked" ? "totalPeStaked" : "totalPixels";
        entries.sort((a, b) => b[sortKey] - a[sortKey]);
        
        data = entries.slice(0, 50).map((e, i) => ({ ...e, rank: i + 1 }));
      }
    } else if (scope === "countries") {
      let query = supabase.from("paint_events").select("user_id, pixel_count, created_at");
      if (timeFilter) query = query.gte("created_at", timeFilter);
      const { data: events, error: eventsError } = await query;
      if (eventsError) throw eventsError;

      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, country_code, pe_used_pe")
        .not("country_code", "is", null);
      if (usersError) throw usersError;

      const userCountryMap = new Map((users || []).map((u) => [u.id, u.country_code]));
      const userPeMap = new Map((users || []).map((u) => [u.id, Number(u.pe_used_pe || 0)]));

      const countryTotals = new Map<string, { pixels: number; peStaked: number; players: Set<string> }>();
      for (const event of events || []) {
        if (event.user_id) {
          const countryCode = userCountryMap.get(event.user_id);
          if (countryCode) {
            const current = countryTotals.get(countryCode) || { pixels: 0, peStaked: 0, players: new Set() };
            current.pixels += event.pixel_count || 0;
            current.players.add(event.user_id);
            countryTotals.set(countryCode, current);
          }
        }
      }

      // Add PE staked per country from all users (not just event users)
      for (const user of users || []) {
        const cc = user.country_code;
        if (cc) {
          const current = countryTotals.get(cc);
          if (current && current.players.has(user.id)) {
            current.peStaked += Number(user.pe_used_pe || 0);
          }
        }
      }

      const sortKey = metric === "pe_staked" ? "peStaked" : "pixels";
      data = Array.from(countryTotals.entries())
        .sort((a, b) => b[1][sortKey] - a[1][sortKey])
        .slice(0, 50)
        .map(([countryCode, stats], index) => ({
          rank: index + 1,
          countryCode,
          playerCount: stats.players.size,
          totalPixels: stats.pixels,
          totalPeStaked: stats.peStaked,
        }));
    } else if (scope === "alliances") {
      let query = supabase.from("paint_events").select("user_id, pixel_count, created_at");
      if (timeFilter) query = query.gte("created_at", timeFilter);
      const { data: events, error: eventsError } = await query;
      if (eventsError) throw eventsError;

      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, alliance_tag, pe_used_pe")
        .not("alliance_tag", "is", null);
      if (usersError) throw usersError;

      const userAllianceMap = new Map((users || []).map((u) => [u.id, u.alliance_tag]));

      const { data: alliances, error: alliancesError } = await supabase
        .from("alliances")
        .select("tag, name");
      if (alliancesError) throw alliancesError;

      const allianceNameMap = new Map((alliances || []).map((a) => [a.tag, a.name]));

      const allianceTotals = new Map<string, { pixels: number; peStaked: number; players: Set<string> }>();
      for (const event of events || []) {
        if (event.user_id) {
          const allianceTag = userAllianceMap.get(event.user_id);
          if (allianceTag) {
            const current = allianceTotals.get(allianceTag) || { pixels: 0, peStaked: 0, players: new Set() };
            current.pixels += event.pixel_count || 0;
            current.players.add(event.user_id);
            allianceTotals.set(allianceTag, current);
          }
        }
      }

      // Add PE staked per alliance
      for (const user of users || []) {
        const tag = user.alliance_tag;
        if (tag) {
          const current = allianceTotals.get(tag);
          if (current && current.players.has(user.id)) {
            current.peStaked += Number(user.pe_used_pe || 0);
          }
        }
      }

      const sortKey = metric === "pe_staked" ? "peStaked" : "pixels";
      data = Array.from(allianceTotals.entries())
        .sort((a, b) => b[1][sortKey] - a[1][sortKey])
        .slice(0, 50)
        .map(([tag, stats], index) => ({
          rank: index + 1,
          allianceTag: tag,
          allianceName: allianceNameMap.get(tag) || tag,
          playerCount: stats.players.size,
          totalPixels: stats.pixels,
          totalPeStaked: stats.peStaked,
        }));
    }

    console.log(`[leaderboard-get] Returning ${data.length} entries`);
    return new Response(JSON.stringify({ data }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[leaderboard-get] Error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
