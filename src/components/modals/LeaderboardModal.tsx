import { useState } from "react";
import { PixelIcon } from "@/components/icons";
import { ProBadge } from "@/components/ui/pro-badge";
import { AdminBadge } from "@/components/ui/admin-badge";
import { getProTier, isAdmin } from "@/lib/userBadges";
import { GamePanel } from "./GamePanel";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useLeaderboard,
  LeaderboardScope,
  LeaderboardSubCategory,
  LeaderboardPeriod,
  PlayerPainterEntry,
  PlayerPeEntry,
  CountryPainterEntry,
  CountryPeEntry,
  AlliancePainterEntry,
  AlliancePeEntry,
  LeaderboardEntry,
} from "@/hooks/useLeaderboard";
import { getCountryByCode } from "@/lib/countries";
import { PlayerProfileModal } from "./PlayerProfileModal";
import { AvatarFallback as AvatarFallbackPattern } from "@/components/ui/avatar-fallback-pattern";
import { PE_PER_USD } from "@/config/energy";

interface LeaderboardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PERIODS: { value: LeaderboardPeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "all", label: "All time" },
];

const SUB_CATEGORIES: { value: LeaderboardSubCategory; label: string; icon: string }[] = [
  { value: "painters", label: "Top Painters", icon: "brush" },
  { value: "investors", label: "Top Investors", icon: "bolt" },
  { value: "defenders", label: "Top Defenders", icon: "cybersecurity" },
  { value: "attackers", label: "Top Attackers", icon: "fire" },
];

function formatNumber(num: number): string {
  return num.toLocaleString();
}

function peToUsd(pe: number): string {
  return (pe / PE_PER_USD).toFixed(2);
}

function getPodiumRowClass(rank: number): string {
  if (rank === 1) return "bg-yellow-500/5";
  if (rank === 2) return "bg-slate-300/5";
  if (rank === 3) return "bg-amber-600/5";
  return "";
}

function MetricDisplay({ subCategory, entry }: { subCategory: LeaderboardSubCategory; entry: LeaderboardEntry }) {
  if (subCategory === "painters") {
    const totalPixels = (entry as PlayerPainterEntry).totalPixels ?? (entry as CountryPainterEntry).totalPixels ?? (entry as AlliancePainterEntry).totalPixels ?? 0;
    return (
      <div className="text-right shrink-0">
        <div className="text-sm font-medium tabular-nums">{formatNumber(totalPixels)} <span className="text-muted-foreground text-xs">px</span></div>
      </div>
    );
  }
  const totalPe = (entry as PlayerPeEntry).totalPe ?? (entry as CountryPeEntry).totalPe ?? (entry as AlliancePeEntry).totalPe ?? 0;
  return (
    <div className="text-right shrink-0">
      <div className="text-sm font-medium tabular-nums">{formatNumber(totalPe)} <span className="text-muted-foreground text-xs">PE</span> <span className="text-xs text-emerald-500">(${peToUsd(totalPe)})</span></div>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return (
    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold animate-shine relative bg-gradient-to-br from-yellow-300 via-yellow-500 to-amber-600 text-white shadow-[0_0_8px_2px_rgba(234,179,8,0.35)]">
      <span className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]">1</span>
    </div>
  );
  if (rank === 2) return (
    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold animate-shine relative bg-gradient-to-br from-slate-200 via-slate-400 to-slate-500 text-white shadow-[0_0_8px_2px_rgba(148,163,184,0.3)]">
      <span className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]">2</span>
    </div>
  );
  if (rank === 3) return (
    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold animate-shine relative bg-gradient-to-br from-amber-500 via-amber-700 to-amber-900 text-white shadow-[0_0_8px_2px_rgba(180,83,9,0.3)]">
      <span className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]">3</span>
    </div>
  );
  return <div className="w-6 h-6 flex items-center justify-center text-xs text-muted-foreground">{rank}</div>;
}

function PlayerRow({ entry, subCategory, onPlayerClick }: { entry: PlayerPainterEntry | PlayerPeEntry; subCategory: LeaderboardSubCategory; onPlayerClick: (id: string) => void }) {
  const country = entry.countryCode ? getCountryByCode(entry.countryCode) : null;
  const displayName = entry.displayName || "Unknown";
  const totalPeForBadge = subCategory !== "painters" ? (entry as PlayerPeEntry).totalPe : 0;
  
  const hasSocials = entry.socialX || entry.socialInstagram || entry.socialWebsite;
  const hasProfileInfo = entry.bio || hasSocials;

  const rowContent = (
    <div className={cn("flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-foreground/5 transition-colors cursor-pointer", getPodiumRowClass(entry.rank))} onClick={() => onPlayerClick(entry.id)}>
      <RankBadge rank={entry.rank} />
      {entry.avatarUrl ? (
        <img src={entry.avatarUrl} alt="" className="w-8 h-8 rounded-full flex-shrink-0 object-cover" />
      ) : (
        <AvatarFallbackPattern seed={entry.id} className="w-8 h-8 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-sm truncate">{displayName}</span>
          {isAdmin(entry.walletAddress) && <AdminBadge />}
          {(() => { const tier = getProTier(totalPeForBadge); return tier ? <ProBadge tier={tier} /> : null; })()}
          {entry.allianceTag && <span className="text-xs text-primary font-medium">[{entry.allianceTag}]</span>}
          {country && <span className="text-sm">{country.flag}</span>}
        </div>
      </div>
      <MetricDisplay subCategory={subCategory} entry={entry} />
    </div>
  );

  if (!hasProfileInfo) return rowContent;

  return (
    <HoverCard openDelay={300} closeDelay={100}>
      <HoverCardTrigger asChild>{rowContent}</HoverCardTrigger>
      <HoverCardContent side="left" align="start" className="w-64">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {entry.avatarUrl ? (
              <img src={entry.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <AvatarFallbackPattern seed={entry.id} className="w-10 h-10" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm truncate">{displayName}</span>
                {country && <span className="text-sm">{country.flag}</span>}
              </div>
              {entry.allianceTag && <span className="text-xs text-primary font-medium">[{entry.allianceTag}]</span>}
            </div>
          </div>
          {entry.bio && <p className="text-sm text-muted-foreground leading-relaxed">{entry.bio}</p>}
          {hasSocials && (
            <div className="flex items-center gap-3 pt-1">
              {entry.socialX && <a href={entry.socialX} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" onClick={(e) => e.stopPropagation()}><PixelIcon name="twitter" size="sm" /></a>}
              {entry.socialInstagram && <a href={entry.socialInstagram} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" onClick={(e) => e.stopPropagation()}><PixelIcon name="instagram" size="sm" /></a>}
              {entry.socialWebsite && <a href={entry.socialWebsite} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" onClick={(e) => e.stopPropagation()}><PixelIcon name="globe" size="sm" /></a>}
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

function CountryRow({ entry, subCategory }: { entry: CountryPainterEntry | CountryPeEntry; subCategory: LeaderboardSubCategory }) {
  const country = getCountryByCode(entry.countryCode);
  return (
    <div className={cn("flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-foreground/5 transition-colors", getPodiumRowClass(entry.rank))}>
      <RankBadge rank={entry.rank} />
      <div className="text-2xl">{country?.flag || "🏳️"}</div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{country?.name || entry.countryCode}</div>
        <div className="text-xs text-muted-foreground">{entry.playerCount} player{entry.playerCount !== 1 ? "s" : ""}</div>
      </div>
      <MetricDisplay subCategory={subCategory} entry={entry} />
    </div>
  );
}

function AllianceRow({ entry, subCategory }: { entry: AlliancePainterEntry | AlliancePeEntry; subCategory: LeaderboardSubCategory }) {
  return (
    <div className={cn("flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-foreground/5 transition-colors", getPodiumRowClass(entry.rank))}>
      <RankBadge rank={entry.rank} />
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        <PixelIcon name="users" size="sm" className="text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-primary font-medium">[{entry.allianceTag}]</span>
          <span className="font-medium text-sm truncate">{entry.allianceName}</span>
        </div>
        <div className="text-xs text-muted-foreground">{entry.playerCount} member{entry.playerCount !== 1 ? "s" : ""}</div>
      </div>
      <MetricDisplay subCategory={subCategory} entry={entry} />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2">
          <Skeleton className="w-6 h-6 rounded-full" />
          <Skeleton className="w-8 h-8 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ scope, subCategory }: { scope: LeaderboardScope; subCategory: LeaderboardSubCategory }) {
  const titles: Record<LeaderboardSubCategory, Record<LeaderboardScope, string>> = {
    painters: { players: "No players have painted yet", countries: "No country activity yet", alliances: "No alliance activity yet" },
    investors: { players: "No investors yet", countries: "No country investors yet", alliances: "No alliance investors yet" },
    defenders: { players: "No defenders yet", countries: "No country defenders yet", alliances: "No alliance defenders yet" },
    attackers: { players: "No attackers yet", countries: "No country attackers yet", alliances: "No alliance attackers yet" },
  };
  const subtitles: Record<LeaderboardSubCategory, string> = {
    painters: "Start painting to climb the ranks!",
    investors: "Stake PE in your pixels to climb the ranks!",
    defenders: "Defend pixels to climb the ranks!",
    attackers: "Attack pixels to climb the ranks!",
  };
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <PixelIcon name="trophy" size="lg" className="mb-3 opacity-50" />
      <p className="text-sm">{titles[subCategory][scope]}</p>
      <p className="text-xs mt-1">{subtitles[subCategory]}</p>
    </div>
  );
}

export function SubCategoryToggle({ subCategory, onChange }: { subCategory: LeaderboardSubCategory; onChange: (s: LeaderboardSubCategory) => void }) {
  return (
    <Select value={subCategory} onValueChange={(v) => onChange(v as LeaderboardSubCategory)}>
      <SelectTrigger className="w-full h-9 text-xs font-medium bg-foreground/5 border-none">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="z-[200]">
        {SUB_CATEGORIES.map((s) => (
          <SelectItem key={s.value} value={s.value}>
            <div className="flex items-center gap-1.5">
              <PixelIcon name={s.icon as any} size="xs" />
              {s.label}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function LeaderboardList({
  scope,
  subCategory,
  period,
  onPlayerClick,
}: {
  scope: LeaderboardScope;
  subCategory: LeaderboardSubCategory;
  period: LeaderboardPeriod;
  onPlayerClick: (id: string) => void;
}) {
  const { data, isLoading, error } = useLeaderboard(scope, subCategory, period);

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <div className="text-center py-8 text-muted-foreground text-sm">Failed to load leaderboard</div>;
  if (data.length === 0) return <EmptyState scope={scope} subCategory={subCategory} />;

  return (
    <div className="space-y-1">
      {data.map((entry) => {
        if (scope === "players") return <PlayerRow key={(entry as PlayerPainterEntry).id || (entry as PlayerPeEntry).id} entry={entry as PlayerPainterEntry | PlayerPeEntry} subCategory={subCategory} onPlayerClick={onPlayerClick} />;
        if (scope === "countries") return <CountryRow key={(entry as CountryPainterEntry).countryCode || (entry as CountryPeEntry).countryCode} entry={entry as CountryPainterEntry | CountryPeEntry} subCategory={subCategory} />;
        return <AllianceRow key={(entry as AlliancePainterEntry).allianceTag || (entry as AlliancePeEntry).allianceTag} entry={entry as AlliancePainterEntry | AlliancePeEntry} subCategory={subCategory} />;
      })}
    </div>
  );
}

export function LeaderboardModal({ open, onOpenChange }: LeaderboardModalProps) {
  const [scope, setScope] = useState<LeaderboardScope>("players");
  const [subCategory, setSubCategory] = useState<LeaderboardSubCategory>("painters");
  const [period, setPeriod] = useState<LeaderboardPeriod>("all");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const handlePlayerClick = (id: string) => {
    setSelectedPlayerId(id);
    setProfileOpen(true);
  };

  return (
    <>
      <GamePanel open={open} onOpenChange={onOpenChange} title="Leaderboard" icon={<PixelIcon name="trophy" size="md" />} size="lg">
        <Tabs value={scope} onValueChange={(v) => setScope(v as LeaderboardScope)} className="w-full">
          <TabsList className="w-full bg-foreground/5">
            <TabsTrigger value="players" className="flex-1 gap-1.5"><PixelIcon name="user" size="xs" />Players</TabsTrigger>
            <TabsTrigger value="countries" className="flex-1 gap-1.5"><PixelIcon name="globe" size="xs" />Countries</TabsTrigger>
            <TabsTrigger value="alliances" className="flex-1 gap-1.5"><PixelIcon name="users" size="xs" />Alliances</TabsTrigger>
          </TabsList>

          {/* Sub-category toggle */}
          <div className="mt-3">
            <SubCategoryToggle subCategory={subCategory} onChange={setSubCategory} />
          </div>

          {/* Time period pills - only for painters */}
          {subCategory === "painters" && (
            <div className="flex gap-1.5 mt-2 justify-center">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded-full transition-colors",
                    period === p.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-foreground/5 text-muted-foreground hover:bg-foreground/10"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          <ScrollArea className="h-[400px] mt-3 -mx-1 px-1">
            <TabsContent value="players" className="mt-0">
              <LeaderboardList scope="players" subCategory={subCategory} period={period} onPlayerClick={handlePlayerClick} />
            </TabsContent>
            <TabsContent value="countries" className="mt-0">
              <LeaderboardList scope="countries" subCategory={subCategory} period={period} onPlayerClick={handlePlayerClick} />
            </TabsContent>
            <TabsContent value="alliances" className="mt-0">
              <LeaderboardList scope="alliances" subCategory={subCategory} period={period} onPlayerClick={handlePlayerClick} />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </GamePanel>

      <PlayerProfileModal open={profileOpen} onOpenChange={setProfileOpen} playerId={selectedPlayerId} />
    </>
  );
}
