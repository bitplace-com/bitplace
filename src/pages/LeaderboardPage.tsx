import { PixelIcon } from "@/components/icons";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";

const LeaderboardPage = () => {
  return (
    <div className="min-h-full bg-background p-6 md:p-8 lg:p-12">
      <div className="max-w-3xl mx-auto space-y-8">
        <PageHeader
          icon={() => <PixelIcon name="trophy" className="h-6 w-6" />}
          title="Leaderboard"
          subtitle="Top pixel owners, biggest stakers, and most conquered territory."
        />

        {/* Coming Soon State */}
        <div className="relative overflow-hidden">
          <SectionCard className="text-center py-12">
            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <PixelIcon name="trophy" className="h-10 w-10 text-primary animate-pulse-soft" />
                </div>
                <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary/20 animate-ping" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-foreground">Coming Soon</h2>
                <p className="text-sm text-muted-foreground max-w-md">
                  We're building the ultimate ranking system. Compete for glory!
                </p>
              </div>

              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium">
                Phase 8: Polish & Launch
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Preview Categories */}
        <div className="grid gap-4 sm:grid-cols-3">
          <PreviewCard
            icon={() => <PixelIcon name="user" className="h-5 w-5" />}
            title="Top Players"
            description="Most pixels painted & PE used"
            color="primary"
          />
          <PreviewCard
            icon={() => <PixelIcon name="globe" className="h-5 w-5" />}
            title="Top Countries"
            description="Nations with most pixels"
            color="defend"
          />
          <PreviewCard
            icon={() => <PixelIcon name="users" className="h-5 w-5" />}
            title="Top Alliances"
            description="Strongest alliances by pixels"
            color="attack"
          />
        </div>
      </div>
    </div>
  );
};

interface PreviewCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  color: "primary" | "defend" | "attack";
}

function PreviewCard({ icon: Icon, title, description, color }: PreviewCardProps) {
  const colorStyles = {
    primary: "bg-primary/5 border-primary/10 text-primary",
    defend: "bg-emerald-500/5 border-emerald-500/10 text-emerald-600",
    attack: "bg-rose-500/5 border-rose-500/10 text-rose-600",
  };

  const iconBgStyles = {
    primary: "bg-primary/10 text-primary",
    defend: "bg-emerald-500/10 text-emerald-600",
    attack: "bg-rose-500/10 text-rose-600",
  };

  return (
    <div className={`p-5 rounded-xl border ${colorStyles[color]} transition-all hover:scale-[1.02]`}>
      <div className="flex items-start gap-4">
        <div className={`h-10 w-10 rounded-lg ${iconBgStyles[color]} flex items-center justify-center shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
          <div className="pt-2">
            <div className="h-1.5 w-24 rounded-full bg-muted/50" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default LeaderboardPage;
