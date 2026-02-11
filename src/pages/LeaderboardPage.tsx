import { useState } from "react";
import { PixelIcon } from "@/components/icons";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  LeaderboardScope,
  LeaderboardPeriod,
  LeaderboardMetric,
} from "@/hooks/useLeaderboard";
import { LeaderboardList, MetricToggle } from "@/components/modals/LeaderboardModal";
import { PlayerProfileModal } from "@/components/modals/PlayerProfileModal";

const PERIODS: { value: LeaderboardPeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "all", label: "All time" },
];

const LeaderboardPage = () => {
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
    <div className="min-h-full bg-background p-6 md:p-8 lg:p-12">
      <div className="max-w-3xl mx-auto space-y-6">
        <PageHeader
          icon={() => <PixelIcon name="trophy" className="h-6 w-6" />}
          title="Leaderboard"
          subtitle="Top pixel owners, biggest stakers, and most conquered territory."
        />

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

          <ScrollArea className="h-[calc(100vh-320px)] mt-4 -mx-1 px-1">
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
      </div>

      <PlayerProfileModal open={profileOpen} onOpenChange={setProfileOpen} playerId={selectedPlayerId} />
    </div>
  );
};

export default LeaderboardPage;
