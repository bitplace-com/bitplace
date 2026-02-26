import { PixelIcon } from "@/components/icons";
import { PEIcon } from "@/components/ui/pe-icon";
import { PixelBalanceIcon } from "@/components/ui/vpe-icon";
import { GamePanel } from "./GamePanel";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/contexts/WalletContext";
import { usePeBalance } from "@/hooks/usePeBalance";
import { useVpeRenew } from "@/hooks/useVpeRenew";
import { useLiveTick } from "@/hooks/useLiveTick";
import { formatLiveCountdown } from "@/lib/formatLiveTime";
import { cn, formatNumber } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

interface PixelControlPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PixelControlPanel({ open, onOpenChange }: PixelControlPanelProps) {
  const { user, energy, isGoogleOnly, isGoogleAuth } = useWallet();
  const peBalance = usePeBalance(user?.id);
  const vpeRenew = useVpeRenew(user?.id);
  const now = useLiveTick();

  const hasWallet = !isGoogleOnly;
  const hasVpe = energy.virtualPeTotal > 0 || isGoogleOnly || isGoogleAuth;

  return (
    <GamePanel
      open={open}
      onOpenChange={onOpenChange}
      title="Pixel Control Center"
      icon={<PixelIcon name="grid3x3" size="md" />}
      size="md"
    >
      <TooltipProvider delayDuration={200}>
        <div className="space-y-5 text-sm">

          {/* ═══ SECTION 1: Pixel Balance ═══ */}
          <div>
            <SectionTitle>
              <PixelBalanceIcon size="xs" className="text-muted-foreground" />
              <TT tip="Your free pixel budget. Sign in with Google to get 300,000 pixels to draw with. These pixels expire 72h after painting and can be painted over by anyone until you add PE.">
                Pixel Balance
              </TT>
            </SectionTitle>

            {hasVpe ? (
              <div className="space-y-3">
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2">
                  <StatBox
                    label="Available"
                    value={formatNumber(energy.virtualPeAvailable)}
                    variant="primary"
                    tip="Pixels you can spend right now to draw on the map."
                  />
                  <StatBox
                    label="Used"
                    value={formatNumber(energy.virtualPeUsed)}
                    tip="Pixels currently placed on the map. Recycled when they expire or are painted over."
                  />
                  <StatBox
                    label="Active Pixels"
                    value={formatNumber(vpeRenew.totalVpePixels)}
                    tip="Pixels you painted using your budget that are still active on the map."
                  />
                </div>

                {/* ── Timer + Renew ── */}
                {vpeRenew.totalVpePixels > 0 && (
                  <div className="space-y-2">
                    {/* Live countdown alert */}
                    {vpeRenew.earliestExpiry && (
                      <div className={cn(
                        "flex items-start gap-2.5 px-3 py-2 rounded-xl border",
                        vpeRenew.expiringBatches.urgent > 0
                          ? "bg-destructive/10 border-destructive/20"
                          : "bg-muted/40 border-border"
                      )}>
                        <PixelIcon
                          name="clock"
                          className={cn(
                            "h-4 w-4 mt-0.5 shrink-0",
                            vpeRenew.expiringBatches.urgent > 0 ? "text-destructive animate-pulse" : "text-muted-foreground"
                          )}
                        />
                        <div className="min-w-0">
                          <p className={cn(
                            "text-xs font-semibold tabular-nums",
                            vpeRenew.expiringBatches.urgent > 0 ? "text-destructive" : "text-foreground"
                          )}>
                            {vpeRenew.expiringBatches.urgent > 0
                              ? `${vpeRenew.expiringBatches.urgent} pixel${vpeRenew.expiringBatches.urgent !== 1 ? "s" : ""} expiring soon!`
                              : `Next expiry in ${formatLiveCountdown(vpeRenew.earliestExpiry, now)}`
                            }
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {formatNumber(vpeRenew.totalVpePixels)} active pixel{vpeRenew.totalVpePixels !== 1 ? "s" : ""} · renew available after 48h
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Renew button */}
                    <Button
                      onClick={vpeRenew.renewAll}
                      disabled={vpeRenew.renewableCount === 0 || vpeRenew.isRenewing}
                      className={cn(
                        "w-full h-9 font-semibold gap-2 text-xs",
                        vpeRenew.renewableCount > 0 ? "bg-primary hover:bg-primary/90" : ""
                      )}
                    >
                      <PixelIcon
                        name="refresh"
                        className={cn("h-3.5 w-3.5", vpeRenew.isRenewing && "animate-spin")}
                      />
                      {vpeRenew.isRenewing
                        ? "Renewing..."
                        : vpeRenew.renewableCount > 0
                          ? `Renew ${vpeRenew.renewableCount} Pixel${vpeRenew.renewableCount !== 1 ? "s" : ""}`
                          : "All pixels up to date"}
                    </Button>
                    <p className="text-[10px] text-muted-foreground text-center">
                      {vpeRenew.renewableCount > 0
                        ? "Resets 72h timer for each renewed pixel"
                        : "Resets 72h timer · available after 48h from last paint"}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="px-3 py-3 rounded-lg bg-muted/30 border border-border">
                <p className="text-xs text-muted-foreground">
                  Sign in with Google to get 300,000 free pixels — a recyclable budget to start drawing on the map.
                </p>
              </div>
            )}
          </div>

          {/* ═══ SECTION 2: PE (Paint Energy) ═══ */}
          <div>
            <SectionTitle>
              <PEIcon size="xs" />
              <TT tip="Paint Energy — your capacity to permanently claim pixels. PE comes from the dollar value of $BIT in your wallet. 1 PE = $0.001.">
                Paint Energy (PE)
              </TT>
            </SectionTitle>

            {hasWallet ? (
              <div className="space-y-3">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-2">
                  <StatBox
                    label="Total"
                    value={formatNumber(energy.peTotal)}
                    variant="primary"
                    tip="Total PE capacity based on the value of $BIT in your wallet."
                  />
                  <StatBox
                    label="Available"
                    value={formatNumber(energy.peAvailable)}
                    variant="primary"
                    tip="PE you can spend right now on paint, defend, or attack."
                  />
                  <StatBox
                    label="Used"
                    value={formatNumber(energy.peUsed)}
                    tip="PE currently locked in pixel stakes and contributions."
                  />
                </div>

                {energy.peTotal === 0 && (
                  <p className="text-[10px] text-amber-500 px-1">
                    Add $BIT to your wallet to get PE
                  </p>
                )}

                {/* Collateralization */}
                {energy.pixelsOwned > 0 && (
                  <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1.5">
                      <TT tip="Your pixel stakes stay valid for 7 days after your last wallet check. After that, stakes decay over 72h to a floor of 1 PE per pixel. Log in to reset.">
                        Collateralization
                      </TT>
                    </p>

                    {peBalance.rebalanceActive ? (
                      <>
                        <div className="flex items-center justify-between">
                          <TT tip="The 7-day grace period has expired and your stakes are now losing value every tick.">
                            <span className="text-xs font-medium text-destructive cursor-help">Grace period expired</span>
                          </TT>
                          <TT tip="Current health of your stakes. At 0% each pixel retains a floor of 1 PE.">
                            <span className="text-xs text-destructive font-semibold tabular-nums cursor-help">
                              Health: {Math.round(peBalance.healthMultiplier * 100)}%
                            </span>
                          </TT>
                        </div>
                        {peBalance.rebalanceEndsAt && (
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                            <TT tip="Decay lasts 72h total. After this time all stakes reach the 1 PE floor.">
                              <span className="cursor-help">Decay ends in</span>
                            </TT>
                            <span className="tabular-nums font-mono">
                              {formatLiveCountdown(peBalance.rebalanceEndsAt, now)}
                            </span>
                          </div>
                        )}
                        <p className="text-[10px] text-muted-foreground">
                          Stakes are decaying over 72h to a floor of 1 PE per pixel. Add $BIT to stop.
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <TT tip="You have 7 days from your last wallet verification before decay begins.">
                            <span className="text-xs font-medium text-foreground cursor-help">Grace period</span>
                          </TT>
                          <span className="text-xs text-emerald-500 font-semibold">Active</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Your pixel stakes stay valid for 7 days after your last wallet check. Log in to reset.
                        </p>
                      </>
                    )}
                  </div>
                )}

                {/* Active Stakes */}
                <div className="space-y-1.5">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-1">
                    Active Stakes
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <StatBox
                      label="DEF Total"
                      value={formatNumber(peBalance.contributionTotal)}
                      icon="shield"
                      tip="Total PE you've contributed to defend pixels. DEF strengthens the pixel's stake and makes it harder to take over."
                    />
                    <StatBox
                      label="ATK Total"
                      value="0"
                      icon="swords"
                      tip="Total PE you've contributed to attack other players' pixels. ATK weakens the pixel's stake."
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-3 py-3 rounded-lg bg-muted/30 border border-border">
                <p className="text-xs text-muted-foreground">
                  Connect a wallet with $BIT to get PE — your power to permanently own and protect pixels on the map.
                </p>
              </div>
            )}
          </div>
        </div>
      </TooltipProvider>
    </GamePanel>
  );
}

/* ═══════════════════════ Sub-components ═══════════════════════ */

/** Section header row */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-1 mb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1.5">
      {children}
    </p>
  );
}

/** Inline tooltip wrapper — wraps any text to show a tooltip on hover */
function TT({ tip, children }: { tip: string; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-help border-b border-dotted border-muted-foreground/40">{children}</span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-64 text-xs z-[9999]">
        {tip}
      </TooltipContent>
    </Tooltip>
  );
}

function StatBox({
  label,
  value,
  icon,
  variant = "default",
  tip,
}: {
  label: string;
  value: string;
  icon?: string;
  variant?: "default" | "primary";
  tip?: string;
}) {
  const inner = (
    <div
      className={cn(
        "p-2.5 rounded-xl border",
        variant === "primary"
          ? "border-primary/20 bg-primary/5"
          : "border-border bg-accent",
        tip && "cursor-help"
      )}
    >
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
        {icon && <PixelIcon name={icon as any} className="h-3 w-3" />}
        {label}
      </p>
      <p className="text-sm font-semibold text-foreground tabular-nums mt-0.5">{value}</p>
    </div>
  );

  if (!tip) return inner;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{inner}</TooltipTrigger>
      <TooltipContent side="top" className="max-w-56 text-xs z-[9999]">
        {tip}
      </TooltipContent>
    </Tooltip>
  );
}

