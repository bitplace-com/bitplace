import { useState } from "react";
import { Trophy, Globe, User, Users, Loader2 } from "lucide-react";
import { GameModal } from "./GameModal";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  useLeaderboard,
  LeaderboardScope,
  LeaderboardPeriod,
  PlayerEntry,
  CountryEntry,
  AllianceEntry,
} from "@/hooks/useLeaderboard";
import { getCountryByCode } from "@/lib/countries";
import { generateAvatarGradient } from "@/lib/avatar";

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

function truncateAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="w-6 h-6 rounded-full bg-yellow-500/20 text-yellow-600 flex items-center justify-center text-xs font-bold">
        1
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="w-6 h-6 rounded-full bg-slate-300/30 text-slate-500 flex items-center justify-center text-xs font-bold">
        2
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="w-6 h-6 rounded-full bg-amber-600/20 text-amber-700 flex items-center justify-center text-xs font-bold">
        3
      </div>
    );
  }
  return (
    <div className="w-6 h-6 flex items-center justify-center text-xs text-muted-foreground">
      {rank}
    </div>
  );
}

function PlayerRow({ entry }: { entry: PlayerEntry }) {
  const country = entry.countryCode ? getCountryByCode(entry.countryCode) : null;
  const displayName = entry.displayName || "Unknown";
  const gradient = generateAvatarGradient(entry.id);

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-foreground/5 transition-colors">
      <RankBadge rank={entry.rank} />
      <div
        className="w-8 h-8 rounded-full flex-shrink-0"
        style={{ background: gradient }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-sm truncate">{displayName}</span>
          {entry.allianceTag && (
            <span className="text-xs text-primary font-medium">[{entry.allianceTag}]</span>
          )}
          {country && <span className="text-sm">{country.flag}</span>}
        </div>
        <div className="text-xs text-muted-foreground">Level {entry.level}</div>
      </div>
      <div className="text-sm font-medium tabular-nums">
        {formatNumber(entry.totalPixels)}
      </div>
    </div>
  );
}

function CountryRow({ entry }: { entry: CountryEntry }) {
  const country = getCountryByCode(entry.countryCode);

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-foreground/5 transition-colors">
      <RankBadge rank={entry.rank} />
      <div className="text-2xl">{country?.flag || "🏳️"}</div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">
          {country?.name || entry.countryCode}
        </div>
        <div className="text-xs text-muted-foreground">
          {entry.playerCount} player{entry.playerCount !== 1 ? "s" : ""}
        </div>
      </div>
      <div className="text-sm font-medium tabular-nums">
        {formatNumber(entry.totalPixels)}
      </div>
    </div>
  );
}

function AllianceRow({ entry }: { entry: AllianceEntry }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-foreground/5 transition-colors">
      <RankBadge rank={entry.rank} />
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Users className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-primary font-medium">[{entry.allianceTag}]</span>
          <span className="font-medium text-sm truncate">{entry.allianceName}</span>
        </div>
        <div className="text-xs text-muted-foreground">
          {entry.playerCount} member{entry.playerCount !== 1 ? "s" : ""}
        </div>
      </div>
      <div className="text-sm font-medium tabular-nums">
        {formatNumber(entry.totalPixels)}
      </div>
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
      <Trophy className="h-10 w-10 mb-3 opacity-50" />
      <p className="text-sm">{messages[scope]}</p>
      <p className="text-xs mt-1">Start painting to climb the ranks!</p>
    </div>
  );
}

function LeaderboardList({
  scope,
  period,
}: {
  scope: LeaderboardScope;
  period: LeaderboardPeriod;
}) {
  const { data, isLoading, error } = useLeaderboard(scope, period);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Failed to load leaderboard
      </div>
    );
  }

  if (data.length === 0) {
    return <EmptyState scope={scope} />;
  }

  return (
    <div className="space-y-1">
      {data.map((entry) => {
        if (scope === "players") {
          return <PlayerRow key={(entry as PlayerEntry).id} entry={entry as PlayerEntry} />;
        }
        if (scope === "countries") {
          return <CountryRow key={(entry as CountryEntry).countryCode} entry={entry as CountryEntry} />;
        }
        return <AllianceRow key={(entry as AllianceEntry).allianceTag} entry={entry as AllianceEntry} />;
      })}
    </div>
  );
}

export function LeaderboardModal({ open, onOpenChange }: LeaderboardModalProps) {
  const [scope, setScope] = useState<LeaderboardScope>("players");
  const [period, setPeriod] = useState<LeaderboardPeriod>("all");

  return (
    <GameModal
      open={open}
      onOpenChange={onOpenChange}
      title="Leaderboard"
      icon={<Trophy className="h-5 w-5" />}
      size="lg"
    >
      <Tabs
        value={scope}
        onValueChange={(v) => setScope(v as LeaderboardScope)}
        className="w-full"
      >
        <TabsList className="w-full bg-foreground/5">
          <TabsTrigger value="players" className="flex-1 gap-1.5">
            <User className="h-3.5 w-3.5" />
            Players
          </TabsTrigger>
          <TabsTrigger value="countries" className="flex-1 gap-1.5">
            <Globe className="h-3.5 w-3.5" />
            Countries
          </TabsTrigger>
          <TabsTrigger value="alliances" className="flex-1 gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Alliances
          </TabsTrigger>
        </TabsList>

        {/* Time period pills */}
        <div className="flex gap-1.5 mt-3">
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

        <ScrollArea className="h-[320px] mt-3 -mx-1 px-1">
          <TabsContent value="players" className="mt-0">
            <LeaderboardList scope="players" period={period} />
          </TabsContent>
          <TabsContent value="countries" className="mt-0">
            <LeaderboardList scope="countries" period={period} />
          </TabsContent>
          <TabsContent value="alliances" className="mt-0">
            <LeaderboardList scope="alliances" period={period} />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </GameModal>
  );
}
