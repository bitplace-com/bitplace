import { FileText, Coins, Shield, Swords, RefreshCw, Grid3X3, Zap, Users, Clock } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { InfoChip } from "@/components/ui/info-chip";

const RulesPage = () => {
  return (
    <div className="min-h-full bg-background p-6 md:p-8 lg:p-12">
      <div className="max-w-3xl mx-auto space-y-8">
        <PageHeader
          icon={FileText}
          title="Bitplace Rules"
          subtitle="Learn how to claim, defend, and conquer pixels on the map."
        />

        {/* Token & Energy */}
        <SectionCard icon={Coins} title="Token & Energy">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <InfoChip variant="primary">$BIT</InfoChip>
              <span className="text-sm text-foreground">The Bitplace token</span>
            </div>
            <div className="flex items-center gap-3">
              <InfoChip variant="primary">PE</InfoChip>
              <span className="text-sm text-foreground">Paint Energy — 1 PE = $0.01</span>
            </div>
            <p className="text-sm text-muted-foreground">
              PE is derived from your wallet's $BIT balance and used for all map actions.
            </p>
          </div>
        </SectionCard>

        {/* Pixel Properties */}
        <SectionCard icon={Grid3X3} title="Pixel Properties">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Each pixel on the map has:</p>
            <div className="grid gap-2">
              <PropertyRow chip="owner" description="Current owner wallet address" />
              <PropertyRow chip="owner_stake" description="PE staked by the owner" />
              <PropertyRow chip="DEF" chipVariant="defend" description="PE contributed by defenders" />
              <PropertyRow chip="ATK" chipVariant="attack" description="PE contributed by attackers" />
            </div>
            <FormulaBlock>V = owner_stake + DEF − ATK</FormulaBlock>
            <p className="text-xs text-muted-foreground">
              V is the pixel's effective value. When V ≤ 0, the pixel can be taken over.
            </p>
          </div>
        </SectionCard>

        {/* DEF/ATK Rules */}
        <SectionCard icon={Shield} title="DEF/ATK Rules">
          <ul className="space-y-3 text-sm">
            <RuleItem>
              <strong>One side per wallet:</strong> You can only DEF or ATK a pixel, never both simultaneously.
            </RuleItem>
            <RuleItem>
              <strong>Owner restriction:</strong> Owners cannot DEF/ATK their own pixels. Use <InfoChip>Reinforce</InfoChip> instead.
            </RuleItem>
            <RuleItem>
              <strong>Owned pixels only:</strong> DEF/ATK is only available on claimed (non-empty) pixels.
            </RuleItem>
            <RuleItem>
              <strong>Instant withdrawals:</strong> DEF/ATK can be withdrawn immediately, no cooldown.
            </RuleItem>
            <RuleItem>
              <strong>No decay:</strong> If your PE collateral is lost, DEF/ATK disappear instantly.
            </RuleItem>
          </ul>
        </SectionCard>

        {/* Takeover & Flip */}
        <SectionCard icon={Zap} title="Takeover & Flip">
          <div className="space-y-5">
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">Takeover Threshold</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>To take over a pixel, you must use more PE than the threshold:</p>
                <div className="mt-3 space-y-2">
                  <FormulaBlock variant="small">
                    Owner in rebalance: max(0, V_floor_next6h) + 1
                  </FormulaBlock>
                  <FormulaBlock variant="small">
                    Owner healthy: max(0, V_now) + 1
                  </FormulaBlock>
                </div>
                <p className="mt-2">Minimum threshold is always <strong className="text-foreground">1 PE</strong>.</p>
              </div>
            </div>
            
            <div className="border-t border-border/30 pt-5">
              <h4 className="text-sm font-semibold text-foreground mb-3">When Flip Occurs</h4>
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">1</span>
                  <span>New painter becomes the owner</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">2</span>
                  <span>Previous owner and all defenders get PE refunded</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">3</span>
                  <span>All attackers become defenders (can withdraw immediately)</span>
                </li>
              </ol>
            </div>
          </div>
        </SectionCard>

        {/* Rebalance & Decay */}
        <SectionCard icon={RefreshCw} title="Rebalance & Decay">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Floor updates every <strong className="text-foreground">6 hours</strong> (12 ticks across 3 days)</span>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <RuleItem>
                Only <InfoChip>owner_stake</InfoChip> can rebalance or decay — DEF/ATK are unaffected.
              </RuleItem>
              <RuleItem>
                Under-collateralized owners decay uniformly over <strong className="text-foreground">3 days</strong>.
              </RuleItem>
              <RuleItem>
                Re-collateralizing stops decay <strong className="text-foreground">immediately</strong>.
              </RuleItem>
            </ul>
          </div>
        </SectionCard>

        {/* Batch Selection */}
        <SectionCard icon={Users} title="Batch / Area Selection">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <RuleItem>
              Drag to select multiple pixels on the map.
            </RuleItem>
            <RuleItem>
              Actions apply uniformly: PE is distributed evenly per pixel.
            </RuleItem>
            <RuleItem>
              <strong className="text-foreground">All-or-nothing:</strong> If any pixel fails validation, the entire action fails.
            </RuleItem>
          </ul>
        </SectionCard>

        {/* Live System */}
        <SectionCard icon={Zap} title="Live System">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              No pre-block locking. All actions use a <strong className="text-foreground">validate → commit</strong> flow.
            </p>
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span>Validate</span>
              </div>
              <span className="text-muted-foreground">→</span>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Commit</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              If the map state changes between validate and commit, the action fails safely.
            </p>
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

// Helper Components
function PropertyRow({ chip, chipVariant, description }: { chip: string; chipVariant?: "default" | "defend" | "attack"; description: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <InfoChip variant={chipVariant || "default"} className="font-mono">{chip}</InfoChip>
      <span className="text-sm text-muted-foreground">{description}</span>
    </div>
  );
}

function FormulaBlock({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "small" }) {
  return (
    <div className={`bg-muted/50 border border-border/30 rounded-lg font-mono text-foreground ${variant === "small" ? "px-3 py-2 text-xs" : "px-4 py-3 text-sm"}`}>
      {children}
    </div>
  );
}

function RuleItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2 text-muted-foreground">
      <span className="text-primary mt-1.5">•</span>
      <span>{children}</span>
    </li>
  );
}

export default RulesPage;
