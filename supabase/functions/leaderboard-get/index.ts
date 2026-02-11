import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting: 5 requests per 10 seconds per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 10000;
const RATE_LIMIT_MAX_REQUESTS = 5;

type Scope = "players" | "countries" | "alliances";
type Period = "today" | "week" | "month" | "all";

interface RequestBody {
  scope: Scope;
  period: Period;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting by IP
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("cf-connecting-ip") || 
                     "unknown";
    
    const now = Date.now();
    const rateLimit = rateLimitMap.get(clientIp);
    
    if (rateLimit && now < rateLimit.resetAt) {
      if (rateLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
        const retryAfter = Math.ceil((rateLimit.resetAt - now) / 1000);
        console.log(`[leaderboard-get] Rate limited IP: ${clientIp}`);
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded" }),
          { 
            status: 429, 
            headers: { 
              ...corsHeaders, 
              "Content-Type": "application/json",
              "Retry-After": retryAfter.toString()
            } 
          }
        );
      }
      rateLimit.count++;
    } else {
      rateLimitMap.set(clientIp, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { scope, period }: RequestBody = await req.json();
    console.log(`[leaderboard-get] Fetching ${scope} for ${period}`);

    if (!["players", "countries", "alliances"].includes(scope)) {
      return new Response(
        JSON.stringify({ error: "Invalid scope" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["today", "week", "month", "all"].includes(period)) {
      return new Response(
        JSON.stringify({ error: "Invalid period" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate time filter
    const getTimeFilter = (): string | null => {
      const now = new Date();
      switch (period) {
        case "today":
          return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
        case "week":
          return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        case "month":
          return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        case "all":
          return null;
      }
    };

    const timeFilter = getTimeFilter();
    let data: unknown[] = [];

    if (scope === "players") {
      // Get all paint events with user data
      let query = supabase
        .from("paint_events")
        .select("user_id, pixel_count, created_at");

      if (timeFilter) {
        query = query.gte("created_at", timeFilter);
      }

      const { data: events, error: eventsError } = await query;
      if (eventsError) throw eventsError;

      // Aggregate by user
      const userTotals = new Map<string, number>();
      for (const event of events || []) {
        if (event.user_id) {
          const current = userTotals.get(event.user_id) || 0;
          userTotals.set(event.user_id, current + (event.pixel_count || 0));
        }
      }

      // Get user details for top users
      const sortedUsers = Array.from(userTotals.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 50);

      if (sortedUsers.length > 0) {
        const userIds = sortedUsers.map(([id]) => id);
        const { data: users, error: usersError } = await supabase
          .from("users")
          .select("id, display_name, country_code, alliance_tag, avatar_url, bio, social_x, social_instagram, social_website, pe_used_pe, pixels_painted_total")
          .in("id", userIds);

        if (usersError) throw usersError;

        const userMap = new Map((users || []).map((u) => [u.id, u]));
        data = sortedUsers.map(([userId, totalPixels], index) => {
          const user = userMap.get(userId);
          return {
            rank: index + 1,
            id: userId,
            displayName: user?.display_name,
            countryCode: user?.country_code,
            allianceTag: user?.alliance_tag,
            totalPixels,
            peUsed: Number(user?.pe_used_pe || 0),
            avatarUrl: user?.avatar_url || null,
            bio: user?.bio || null,
            socialX: user?.social_x || null,
            socialInstagram: user?.social_instagram || null,
            socialWebsite: user?.social_website || null,
          };
        });
      }
    } else if (scope === "countries") {
      // Get paint events with user country codes
      let query = supabase
        .from("paint_events")
        .select("user_id, pixel_count, created_at");

      if (timeFilter) {
        query = query.gte("created_at", timeFilter);
      }

      const { data: events, error: eventsError } = await query;
      if (eventsError) throw eventsError;

      // Get all users with country codes
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, country_code")
        .not("country_code", "is", null);

      if (usersError) throw usersError;

      const userCountryMap = new Map((users || []).map((u) => [u.id, u.country_code]));

      // Aggregate by country
      const countryTotals = new Map<string, { pixels: number; players: Set<string> }>();
      for (const event of events || []) {
        if (event.user_id) {
          const countryCode = userCountryMap.get(event.user_id);
          if (countryCode) {
            const current = countryTotals.get(countryCode) || { pixels: 0, players: new Set() };
            current.pixels += event.pixel_count || 0;
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
      // Get paint events
      let query = supabase
        .from("paint_events")
        .select("user_id, pixel_count, created_at");

      if (timeFilter) {
        query = query.gte("created_at", timeFilter);
      }

      const { data: events, error: eventsError } = await query;
      if (eventsError) throw eventsError;

      // Get users with alliance tags
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, alliance_tag")
        .not("alliance_tag", "is", null);

      if (usersError) throw usersError;

      const userAllianceMap = new Map((users || []).map((u) => [u.id, u.alliance_tag]));

      // Get alliance names
      const { data: alliances, error: alliancesError } = await supabase
        .from("alliances")
        .select("tag, name");

      if (alliancesError) throw alliancesError;

      const allianceNameMap = new Map((alliances || []).map((a) => [a.tag, a.name]));

      // Aggregate by alliance
      const allianceTotals = new Map<string, { pixels: number; players: Set<string> }>();
      for (const event of events || []) {
        if (event.user_id) {
          const allianceTag = userAllianceMap.get(event.user_id);
          if (allianceTag) {
            const current = allianceTotals.get(allianceTag) || { pixels: 0, players: new Set() };
            current.pixels += event.pixel_count || 0;
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

    console.log(`[leaderboard-get] Returning ${data.length} entries`);

    return new Response(
      JSON.stringify({ data }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[leaderboard-get] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
