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
import {
  useLeaderboard,
  LeaderboardScope,
  LeaderboardPeriod,
  LeaderboardMetric,
  PlayerEntry,
  CountryEntry,
  AllianceEntry,
} from "@/hooks/useLeaderboard";
import { getCountryByCode } from "@/lib/countries";
import { generateAvatarGradient } from "@/lib/avatar";
import { PlayerProfileModal } from "./PlayerProfileModal";
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

function formatNumber(num: number): string {
  return num.toLocaleString();
}

function peToUsd(pe: number): string {
  return (pe / PE_PER_USD).toFixed(2);
}

function MetricValue({ metric, totalPixels, totalPeStaked }: { metric: LeaderboardMetric; totalPixels: number; totalPeStaked: number }) {
  if (metric === "pixels") {
    return (
      <div className="text-right shrink-0">
        <div className="text-sm font-medium tabular-nums">{formatNumber(totalPixels)} <span className="text-muted-foreground text-xs">px</span></div>
        <div className="text-xs text-muted-foreground tabular-nums">{formatNumber(totalPeStaked)} PE <span className="opacity-70">(${peToUsd(totalPeStaked)})</span></div>
      </div>
    );
  }
  return (
    <div className="text-right shrink-0">
      <div className="text-sm font-medium tabular-nums">{formatNumber(totalPeStaked)} <span className="text-muted-foreground text-xs">PE</span> <span className="text-xs text-muted-foreground">(${peToUsd(totalPeStaked)})</span></div>
      <div className="text-xs text-muted-foreground tabular-nums">{formatNumber(totalPixels)} px</div>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <div className="w-6 h-6 rounded-full bg-yellow-500/20 text-yellow-600 flex items-center justify-center text-xs font-bold">1</div>;
  if (rank === 2) return <div className="w-6 h-6 rounded-full bg-slate-300/30 text-slate-500 flex items-center justify-center text-xs font-bold">2</div>;
  if (rank === 3) return <div className="w-6 h-6 rounded-full bg-amber-600/20 text-amber-700 flex items-center justify-center text-xs font-bold">3</div>;
  return <div className="w-6 h-6 flex items-center justify-center text-xs text-muted-foreground">{rank}</div>;
}

function PlayerRow({ entry, metric, onPlayerClick }: { entry: PlayerEntry; metric: LeaderboardMetric; onPlayerClick: (id: string) => void }) {
  const country = entry.countryCode ? getCountryByCode(entry.countryCode) : null;
  const displayName = entry.displayName || "Unknown";
  const gradient = generateAvatarGradient(entry.id);
  const hasSocials = entry.socialX || entry.socialInstagram || entry.socialWebsite;
  const hasProfileInfo = entry.bio || hasSocials;

  const rowContent = (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-foreground/5 transition-colors cursor-pointer" onClick={() => onPlayerClick(entry.id)}>
      <RankBadge rank={entry.rank} />
      {entry.avatarUrl ? (
        <img src={entry.avatarUrl} alt="" className="w-8 h-8 rounded-full flex-shrink-0 object-cover" />
      ) : (
        <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-sm" style={{ background: gradient }}>
          {(entry.displayName?.[0] || '?').toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-sm truncate">{displayName}</span>
          {isAdmin(entry.walletAddress) && <AdminBadge />}
          {(() => { const tier = getProTier(entry.totalPeStaked); return tier ? <ProBadge tier={tier} /> : null; })()}
          {entry.allianceTag && <span className="text-xs text-primary font-medium">[{entry.allianceTag}]</span>}
          {country && <span className="text-sm">{country.flag}</span>}
        </div>
      </div>
      <MetricValue metric={metric} totalPixels={entry.totalPixels} totalPeStaked={entry.totalPeStaked} />
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
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-base" style={{ background: gradient }}>
                {(entry.displayName?.[0] || '?').toUpperCase()}
              </div>
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
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border">
            <span>{formatNumber(entry.totalPixels)} pixels</span>
            <span>{formatNumber(entry.totalPeStaked)} PE (${peToUsd(entry.totalPeStaked)})</span>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

function CountryRow({ entry, metric }: { entry: CountryEntry; metric: LeaderboardMetric }) {
  const country = getCountryByCode(entry.countryCode);
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-foreground/5 transition-colors">
      <RankBadge rank={entry.rank} />
      <div className="text-2xl">{country?.flag || "🏳️"}</div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{country?.name || entry.countryCode}</div>
        <div className="text-xs text-muted-foreground">{entry.playerCount} player{entry.playerCount !== 1 ? "s" : ""}</div>
      </div>
      <MetricValue metric={metric} totalPixels={entry.totalPixels} totalPeStaked={entry.totalPeStaked} />
    </div>
  );
}

function AllianceRow({ entry, metric }: { entry: AllianceEntry; metric: LeaderboardMetric }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-foreground/5 transition-colors">
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
      <MetricValue metric={metric} totalPixels={entry.totalPixels} totalPeStaked={entry.totalPeStaked} />
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

function EmptyState({ scope }: { scope: LeaderboardScope }) {
  const messages: Record<LeaderboardScope, string> = {
    players: "No players have painted yet",
    countries: "No country activity yet",
    alliances: "No alliance activity yet",
  };
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <PixelIcon name="usersCrown" size="lg" className="mb-3 opacity-50" />
      <p className="text-sm">{messages[scope]}</p>
      <p className="text-xs mt-1">Start painting to climb the ranks!</p>
    </div>
  );
}

export function LeaderboardList({
  scope,
  period,
  metric,
  onPlayerClick,
}: {
  scope: LeaderboardScope;
  period: LeaderboardPeriod;
  metric: LeaderboardMetric;
  onPlayerClick: (id: string) => void;
}) {
  const { data, isLoading, error } = useLeaderboard(scope, period, metric);

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <div className="text-center py-8 text-muted-foreground text-sm">Failed to load leaderboard</div>;
  if (data.length === 0) return <EmptyState scope={scope} />;

  return (
    <div className="space-y-1">
      {data.map((entry) => {
        if (scope === "players") return <PlayerRow key={(entry as PlayerEntry).id} entry={entry as PlayerEntry} metric={metric} onPlayerClick={onPlayerClick} />;
        if (scope === "countries") return <CountryRow key={(entry as CountryEntry).countryCode} entry={entry as CountryEntry} metric={metric} />;
        return <AllianceRow key={(entry as AllianceEntry).allianceTag} entry={entry as AllianceEntry} metric={metric} />;
      })}
    </div>
  );
}

export function MetricToggle({ metric, onChange }: { metric: LeaderboardMetric; onChange: (m: LeaderboardMetric) => void }) {
  return (
    <div className="flex gap-1 p-0.5 bg-foreground/5 rounded-lg">
      <button
        onClick={() => onChange("pixels")}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all",
          metric === "pixels"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <PixelIcon name="brush" size="xs" />
        Pixels Painted
      </button>
      <button
        onClick={() => onChange("pe_staked")}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all",
          metric === "pe_staked"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <PixelIcon name="bolt" size="xs" />
        PE Staked
      </button>
    </div>
  );
}

export function LeaderboardModal({ open, onOpenChange }: LeaderboardModalProps) {
  const [scope, setScope] = useState<LeaderboardScope>("players");
  const [period, setPeriod] = useState<LeaderboardPeriod>("all");
  const [metric, setMetric] = useState<LeaderboardMetric>("pixels");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const handlePlayerClick = (id: string) => {
    setSelectedPlayerId(id);
    setProfileOpen(true);
  };

  return (
    <>
      <GamePanel open={open} onOpenChange={onOpenChange} title="Leaderboard" icon={<PixelIcon name="usersCrown" size="md" />} size="lg">
        <Tabs value={scope} onValueChange={(v) => setScope(v as LeaderboardScope)} className="w-full">
          <TabsList className="w-full bg-foreground/5">
            <TabsTrigger value="players" className="flex-1 gap-1.5"><PixelIcon name="user" size="xs" />Players</TabsTrigger>
            <TabsTrigger value="countries" className="flex-1 gap-1.5"><PixelIcon name="globe" size="xs" />Countries</TabsTrigger>
            <TabsTrigger value="alliances" className="flex-1 gap-1.5"><PixelIcon name="users" size="xs" />Alliances</TabsTrigger>
          </TabsList>

          {/* Metric toggle */}
          <div className="mt-3">
            <MetricToggle metric={metric} onChange={setMetric} />
          </div>

          {/* Time period pills */}
          <div className="flex gap-1.5 mt-2">
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

          <ScrollArea className="h-[400px] mt-3 -mx-1 px-1">
            <TabsContent value="players" className="mt-0">
              <LeaderboardList scope="players" period={period} metric={metric} onPlayerClick={handlePlayerClick} />
            </TabsContent>
            <TabsContent value="countries" className="mt-0">
              <LeaderboardList scope="countries" period={period} metric={metric} onPlayerClick={handlePlayerClick} />
            </TabsContent>
            <TabsContent value="alliances" className="mt-0">
              <LeaderboardList scope="alliances" period={period} metric={metric} onPlayerClick={handlePlayerClick} />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </GamePanel>

      <PlayerProfileModal open={profileOpen} onOpenChange={setProfileOpen} playerId={selectedPlayerId} />
    </>
  );
}
