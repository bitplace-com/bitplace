import { PixelIcon } from "@/components/icons";
import { PEIcon } from "@/components/ui/pe-icon";
import { VPEIcon } from "@/components/ui/vpe-icon";
import { GamePanel } from "./GamePanel";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/contexts/WalletContext";
import { usePeBalance } from "@/hooks/usePeBalance";
import { useVpeRenew } from "@/hooks/useVpeRenew";
import { cn, formatNumber } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

interface PixelControlPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatTimeRemaining(endsAt: Date): string {
  const diff = endsAt.getTime() - Date.now();
  if (diff <= 0) return "expired";
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}

export function PixelControlPanel({ open, onOpenChange }: PixelControlPanelProps) {
  const { user, energy, isGoogleOnly, isGoogleAuth } = useWallet();
  const peBalance = usePeBalance(user?.id);
  const vpeRenew = useVpeRenew(user?.id);

  const hasWallet = !isGoogleOnly;
  const hasVpe = energy.virtualPeTotal > 0 || isGoogleOnly || isGoogleAuth;

  return (
    <GamePanel
      open={open}
      onOpenChange={onOpenChange}
      title="Pixel Control"
      icon={<PixelIcon name="grid3x3" size="md" />}
      size="md"
    >
      <TooltipProvider delayDuration={200}>
        <div className="space-y-5 text-sm">

          {/* SECTION A: Pixel Overview */}
          <div>
            <p className="px-1 mb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Overview
            </p>
            <div className="grid grid-cols-2 gap-2">
              <StatBox label="Pixels Owned" value={formatNumber(energy.pixelsOwned)} icon="grid2x2" />
              <StatBox label="PE Staked" value={formatNumber(energy.pixelStakeTotal)} icon="coins" />
              <StatBox label="Total Value" value={`${formatNumber(energy.pixelStakeTotal)} PE`} icon="chart" />
              <StatBox label="Pixels Painted" value={formatNumber((user as any)?.pixels_painted_total || 0)} icon="brush" />
            </div>
          </div>

          {/* SECTION B: PE (Paint Energy) */}
          <div>
            <p className="px-1 mb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1.5">
              <PEIcon size="xs" /> Paint Energy (PE)
            </p>
            {hasWallet ? (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <StatBox label="Total" value={formatNumber(energy.peTotal)} variant="primary" />
                  <StatBox label="Available" value={formatNumber(energy.peAvailable)} variant="primary" />
                  <StatBox label="Used" value={formatNumber(energy.peUsed)} />
                </div>
                <p className="text-[10px] text-muted-foreground px-1">
                  Your PE comes from the $ value of $BIT in your wallet. 1 PE = $0.001.
                </p>
                {energy.peTotal === 0 && (
                  <p className="text-[10px] text-amber-500 px-1">
                    Add $BIT to your wallet to get PE
                  </p>
                )}
                {/* Rebalance Warning */}
                {peBalance.rebalanceActive && (
                  <div className="px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 space-y-1">
                    <div className="flex items-center gap-2">
                      <PixelIcon name="heart" className="h-3.5 w-3.5 text-destructive animate-pulse" />
                      <span className="text-xs font-semibold text-destructive">
                        Decay Active — {Math.round(peBalance.healthMultiplier * 100)}%
                      </span>
                      {peBalance.rebalanceEndsAt && (
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          {formatTimeRemaining(peBalance.rebalanceEndsAt)} left
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Your wallet value is below your total staked PE. Stakes are decaying gradually. Add $BIT to stop.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="px-3 py-3 rounded-lg bg-muted/30 border border-border">
                <p className="text-xs text-muted-foreground">
                  Connect a wallet and add $BIT to earn PE — your capacity to permanently claim pixels.
                </p>
              </div>
            )}
          </div>

          {/* SECTION C: VPE (Virtual Paint Energy) */}
          <div>
            <p className="px-1 mb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1.5">
              <VPEIcon size="xs" className="text-muted-foreground" /> Virtual Paint Energy (VPE)
            </p>
            {hasVpe ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <StatBox label="Available" value={formatNumber(energy.virtualPeAvailable)} variant="primary" />
                  <StatBox label="Used" value={formatNumber(energy.virtualPeUsed)} />
                  <StatBox label="Active Pixels" value={formatNumber(vpeRenew.totalVpePixels)} />
                </div>

                {/* Expiration Breakdown */}
                {vpeRenew.totalVpePixels > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-1">
                      Expiration Breakdown
                    </p>
                    <div className="space-y-1">
                      {vpeRenew.expiringBatches.urgent > 0 && (
                        <ExpiryRow
                          label="Expiring in < 6h"
                          count={vpeRenew.expiringBatches.urgent}
                          variant="urgent"
                        />
                      )}
                      {vpeRenew.expiringBatches.soon > 0 && (
                        <ExpiryRow
                          label="Expiring in 6-24h"
                          count={vpeRenew.expiringBatches.soon}
                          variant="soon"
                        />
                      )}
                      {vpeRenew.expiringBatches.upcoming > 0 && (
                        <ExpiryRow
                          label="Expiring in 24-48h"
                          count={vpeRenew.expiringBatches.upcoming}
                          variant="upcoming"
                        />
                      )}
                      {vpeRenew.expiringBatches.safe > 0 && (
                        <ExpiryRow
                          label="Safe (48h+ remaining)"
                          count={vpeRenew.expiringBatches.safe}
                          variant="safe"
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Renew Button */}
                <div className="space-y-1.5">
                  <Button
                    onClick={vpeRenew.renewAll}
                    disabled={vpeRenew.renewableCount === 0 || vpeRenew.isRenewing}
                    className={cn(
                      "w-full h-11 font-semibold gap-2",
                      vpeRenew.renewableCount > 0
                        ? "bg-primary hover:bg-primary/90"
                        : ""
                    )}
                  >
                    <PixelIcon
                      name="refresh"
                      className={cn("h-4 w-4", vpeRenew.isRenewing && "animate-spin")}
                    />
                    {vpeRenew.isRenewing
                      ? "Renewing..."
                      : vpeRenew.renewableCount > 0
                        ? `Renew ${vpeRenew.renewableCount} VPE Pixel${vpeRenew.renewableCount !== 1 ? "s" : ""}`
                        : "All VPE pixels up to date"
                    }
                  </Button>
                  <p className="text-[10px] text-muted-foreground text-center">
                    {vpeRenew.renewableCount > 0
                      ? "Resets the 72h timer. Available for pixels with 48h+ elapsed."
                      : "Renewal becomes available after 48h from last paint or renewal."
                    }
                  </p>
                </div>

                <p className="text-[10px] text-muted-foreground px-1">
                  VPE pixels expire after 72h. After 48h you can renew all at once — no need to repaint.
                </p>
              </div>
            ) : (
              <div className="px-3 py-3 rounded-lg bg-muted/30 border border-border">
                <p className="text-xs text-muted-foreground">
                  Sign in with Google to get 300,000 free VPE — recyclable energy to try the game.
                </p>
              </div>
            )}
          </div>

          {/* SECTION D: Collateralization */}
          {hasWallet && energy.pixelsOwned > 0 && (
            <div>
              <p className="px-1 mb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Collateralization
              </p>
              <div className="px-3 py-2.5 rounded-lg bg-muted/30 border border-border space-y-2">
                {peBalance.rebalanceActive ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-destructive">Grace period expired</span>
                      <span className="text-xs text-destructive font-semibold tabular-nums">
                        Health: {Math.round(peBalance.healthMultiplier * 100)}%
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Stakes are decaying over 72h to a floor of 1 PE per pixel. Log in and add $BIT to stop.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground">Grace period</span>
                      <span className="text-xs text-emerald-500 font-semibold">Active</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Your pixel stakes stay valid for 7 days after your last wallet check. After that, stakes decay over 72h to a floor of 1 PE per pixel. Log in to reset.
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* SECTION E: Active Stakes */}
          {hasWallet && (
            <div>
              <p className="px-1 mb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Active Stakes
              </p>
              <div className="grid grid-cols-2 gap-2">
                <StatBox label="DEF Total" value={formatNumber(peBalance.contributionTotal)} icon="shield" />
                <StatBox label="ATK Total" value="0" icon="swords" />
              </div>
            </div>
          )}
        </div>
      </TooltipProvider>
    </GamePanel>
  );
}

/* ---- Sub-components ---- */

function StatBox({
  label,
  value,
  icon,
  variant = "default",
}: {
  label: string;
  value: string;
  icon?: string;
  variant?: "default" | "primary";
}) {
  return (
    <div
      className={cn(
        "p-2.5 rounded-xl border",
        variant === "primary"
          ? "border-primary/20 bg-primary/5"
          : "border-border bg-accent"
      )}
    >
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
        {icon && <PixelIcon name={icon as any} className="h-3 w-3" />}
        {label}
      </p>
      <p className="text-sm font-semibold text-foreground tabular-nums mt-0.5">{value}</p>
    </div>
  );
}

function ExpiryRow({
  label,
  count,
  variant,
}: {
  label: string;
  count: number;
  variant: "urgent" | "soon" | "upcoming" | "safe";
}) {
  const styles = {
    urgent: "bg-destructive/10 border-destructive/20 text-destructive",
    soon: "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400",
    upcoming: "bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400",
    safe: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
  };

  const icons = {
    urgent: "alert",
    soon: "clock",
    upcoming: "clock",
    safe: "check",
  };

  return (
    <div className={cn("flex items-center justify-between px-3 py-1.5 rounded-lg border text-xs", styles[variant])}>
      <span className="flex items-center gap-1.5">
        <PixelIcon name={icons[variant] as any} className={cn("h-3 w-3", variant === "urgent" && "animate-pulse")} />
        {label}
      </span>
      <span className="font-semibold tabular-nums">{count}</span>
    </div>
  );
}
