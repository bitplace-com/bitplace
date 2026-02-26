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

// deno-lint-ignore no-explicit-any
type SB = any;

/* ── Paginated fetch for paint_events ── */
async function fetchPaintEvents(supabase: SB, timeFilter: string | null) {
  // deno-lint-ignore no-explicit-any
  const allData: any[] = [];
  const batchSize = 1000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from("paint_events")
      .select("user_id, pixel_count, action_type")
      .in("action_type", ["PAINT", "ERASE"]);
    if (timeFilter) query = query.gte("created_at", timeFilter);
    query = query.range(offset, offset + batchSize - 1);

    const { data, error } = await query;
    if (error) throw error;
    if (data && data.length > 0) {
      allData.push(...data);
      offset += batchSize;
      hasMore = data.length === batchSize;
    } else {
      hasMore = false;
    }
  }
  return allData;
}

/* ── Aggregate paint events by user ── */
// deno-lint-ignore no-explicit-any
function aggregateByUser(events: any[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const e of events) {
    if (!e.user_id) continue;
    const delta = e.action_type === "ERASE" ? -(e.pixel_count || 0) : (e.pixel_count || 0);
    totals.set(e.user_id, (totals.get(e.user_id) || 0) + delta);
  }
  // Clamp negatives to 0
  for (const [uid, val] of totals) {
    if (val < 0) totals.set(uid, 0);
  }
  return totals;
}

/* ── Fetch user profiles by IDs ── */
async function fetchUserProfiles(supabase: SB, userIds: string[]) {
  if (userIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from("users")
    .select("id, display_name, country_code, alliance_tag, avatar_url, bio, social_x, social_instagram, social_website, wallet_address, auth_provider")
    .in("id", userIds);
  if (error) throw error;
  // deno-lint-ignore no-explicit-any
  return new Map((data || []).map((u: any) => [u.id, u]));
}

/* ── Build player entry from user row ── */
// deno-lint-ignore no-explicit-any
function playerEntry(user: any, totalPixels: number) {
  return {
    id: user.id,
    displayName: user.display_name,
    countryCode: user.country_code,
    allianceTag: user.alliance_tag,
    totalPixels,
    avatarUrl: user.avatar_url || null,
    bio: user.bio || null,
    socialX: user.social_x || null,
    socialInstagram: user.social_instagram || null,
    socialWebsite: user.social_website || null,
    walletAddress: user.wallet_address || null,
    authProvider: user.auth_provider || null,
  };
}

/* ── "All time" painters: read directly from users table ── */
async function paintersAllTime(supabase: SB, scope: MacroScope) {
  if (scope === "players") {
    const { data, error } = await supabase
      .from("users")
      .select("id, display_name, country_code, alliance_tag, avatar_url, bio, social_x, social_instagram, social_website, wallet_address, auth_provider, pixels_painted_total")
      .gt("pixels_painted_total", 0)
      .order("pixels_painted_total", { ascending: false })
      .limit(50);
    if (error) throw error;
    // deno-lint-ignore no-explicit-any
    return (data || []).map((u: any, i: number) => ({ ...playerEntry(u, u.pixels_painted_total), rank: i + 1 }));
  }

  if (scope === "countries") {
    const { data, error } = await supabase
      .from("users")
      .select("id, country_code, pixels_painted_total")
      .not("country_code", "is", null)
      .gt("pixels_painted_total", 0);
    if (error) throw error;

    const countryMap = new Map<string, { pixels: number; players: Set<string> }>();
    // deno-lint-ignore no-explicit-any
    for (const u of data || [] as any[]) {
      const cur = countryMap.get(u.country_code) || { pixels: 0, players: new Set() };
      cur.pixels += u.pixels_painted_total;
      cur.players.add(u.id);
      countryMap.set(u.country_code, cur);
    }
    return Array.from(countryMap.entries())
      .sort((a, b) => b[1].pixels - a[1].pixels)
      .slice(0, 50)
      .map(([cc, s], i) => ({ rank: i + 1, countryCode: cc, playerCount: s.players.size, totalPixels: s.pixels }));
  }

  // alliances
  const { data: users, error: usersErr } = await supabase
    .from("users")
    .select("id, alliance_tag, pixels_painted_total")
    .not("alliance_tag", "is", null)
    .gt("pixels_painted_total", 0);
  if (usersErr) throw usersErr;

  const { data: alliances } = await supabase.from("alliances").select("tag, name");
  const nameMap = new Map((alliances || []).map((a: { tag: string; name: string }) => [a.tag, a.name]));

  const allianceMap = new Map<string, { pixels: number; players: Set<string> }>();
  // deno-lint-ignore no-explicit-any
  for (const u of users || [] as any[]) {
    const cur = allianceMap.get(u.alliance_tag) || { pixels: 0, players: new Set() };
    cur.pixels += u.pixels_painted_total;
    cur.players.add(u.id);
    allianceMap.set(u.alliance_tag, cur);
  }
  return Array.from(allianceMap.entries())
    .sort((a, b) => b[1].pixels - a[1].pixels)
    .slice(0, 50)
    .map(([tag, s], i) => ({ rank: i + 1, allianceTag: tag, allianceName: nameMap.get(tag) || tag, playerCount: s.players.size, totalPixels: s.pixels }));
}

/* ── Filtered period painters: use paint_events with pagination ── */
async function paintersFiltered(supabase: SB, scope: MacroScope, timeFilter: string) {
  const events = await fetchPaintEvents(supabase, timeFilter);
  const userTotals = aggregateByUser(events);

  if (scope === "players") {
    const userMap = await fetchUserProfiles(supabase, Array.from(userTotals.keys()));
    const entries = Array.from(userTotals.entries())
      .map(([uid, total]) => playerEntry(userMap.get(uid) || { id: uid }, total))
      .sort((a, b) => b.totalPixels - a.totalPixels);
    return entries.slice(0, 50).map((e, i) => ({ ...e, rank: i + 1 }));
  }

  if (scope === "countries") {
    const { data: users } = await supabase.from("users").select("id, country_code").not("country_code", "is", null);
    // deno-lint-ignore no-explicit-any
    const userCountryMap = new Map((users || []).map((u: any) => [u.id, u.country_code]));
    const countryTotals = new Map<string, { pixels: number; players: Set<string> }>();
    for (const [uid, total] of userTotals) {
      const cc = userCountryMap.get(uid);
      if (!cc) continue;
      const cur = countryTotals.get(cc) || { pixels: 0, players: new Set() };
      cur.pixels += total;
      cur.players.add(uid);
      countryTotals.set(cc, cur);
    }
    return Array.from(countryTotals.entries())
      .sort((a, b) => b[1].pixels - a[1].pixels)
      .slice(0, 50)
      .map(([cc, s], i) => ({ rank: i + 1, countryCode: cc, playerCount: s.players.size, totalPixels: s.pixels }));
  }

  // alliances
  const { data: users } = await supabase.from("users").select("id, alliance_tag").not("alliance_tag", "is", null);
  // deno-lint-ignore no-explicit-any
  const userAllianceMap = new Map((users || []).map((u: any) => [u.id, u.alliance_tag]));
  const { data: alliances } = await supabase.from("alliances").select("tag, name");
  const nameMap = new Map((alliances || []).map((a: { tag: string; name: string }) => [a.tag, a.name]));

  const allianceTotals = new Map<string, { pixels: number; players: Set<string> }>();
  for (const [uid, total] of userTotals) {
    const tag = userAllianceMap.get(uid);
    if (!tag) continue;
    const cur = allianceTotals.get(tag) || { pixels: 0, players: new Set() };
    cur.pixels += total;
    cur.players.add(uid);
    allianceTotals.set(tag, cur);
  }
  return Array.from(allianceTotals.entries())
    .sort((a, b) => b[1].pixels - a[1].pixels)
    .slice(0, 50)
    .map(([tag, s], i) => ({ rank: i + 1, allianceTag: tag, allianceName: nameMap.get(tag) || tag, playerCount: s.players.size, totalPixels: s.pixels }));
}

/* ── PE-based leaderboards (investors/defenders/attackers) ── */
async function peLeaderboard(supabase: SB, scope: MacroScope, subCategory: SubCategory) {
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
    authProvider: null,
  }));

  if (scope === "players") {
    return entries.slice(0, 50).map((e: typeof entries[0], i: number) => ({ ...e, rank: i + 1 }));
  }

  if (scope === "countries") {
    const countryMap = new Map<string, { totalPe: number; players: Set<string> }>();
    for (const e of entries) {
      if (!e.countryCode) continue;
      const cur = countryMap.get(e.countryCode) || { totalPe: 0, players: new Set() };
      cur.totalPe += e.totalPe;
      cur.players.add(e.id);
      countryMap.set(e.countryCode, cur);
    }
    return Array.from(countryMap.entries())
      .sort((a, b) => b[1].totalPe - a[1].totalPe)
      .slice(0, 50)
      .map(([cc, s], i) => ({ rank: i + 1, countryCode: cc, playerCount: s.players.size, totalPe: s.totalPe }));
  }

  // alliances
  const { data: alliances } = await supabase.from("alliances").select("tag, name");
  const nameMap = new Map((alliances || []).map((a: { tag: string; name: string }) => [a.tag, a.name]));
  const allianceMap = new Map<string, { totalPe: number; players: Set<string> }>();
  for (const e of entries) {
    if (!e.allianceTag) continue;
    const cur = allianceMap.get(e.allianceTag) || { totalPe: 0, players: new Set() };
    cur.totalPe += e.totalPe;
    cur.players.add(e.id);
    allianceMap.set(e.allianceTag, cur);
  }
  return Array.from(allianceMap.entries())
    .sort((a, b) => b[1].totalPe - a[1].totalPe)
    .slice(0, 50)
    .map(([tag, s], i) => ({ rank: i + 1, allianceTag: tag, allianceName: nameMap.get(tag) || tag, playerCount: s.players.size, totalPe: s.totalPe }));
}

/* ── Main handler ── */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting
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

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

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

    let data: unknown[];

    if (subCategory !== "painters") {
      data = await peLeaderboard(supabase, scope, subCategory);
    } else if (period === "all") {
      data = await paintersAllTime(supabase, scope);
    } else {
      const nowDate = new Date();
      const timeFilter = period === "today"
        ? new Date(nowDate.getTime() - 24 * 60 * 60 * 1000).toISOString()
        : period === "week"
          ? new Date(nowDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
          : new Date(nowDate.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      data = await paintersFiltered(supabase, scope, timeFilter);
    }

    console.log(`[leaderboard-get] Returning ${data.length} entries`);
    return new Response(JSON.stringify({ data }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[leaderboard-get] Error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
