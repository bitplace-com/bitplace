import { Link } from 'react-router-dom';
import { PixelIcon } from '@/components/icons';
import { PEIcon } from '@/components/ui/pe-icon';
import { PixelBalanceIcon } from '@/components/ui/vpe-icon';
import { usePeBalance } from '@/hooks/usePeBalance';
import { useWallet } from '@/contexts/WalletContext';
import { usePaintCooldown } from '@/hooks/usePaintCooldown';
import { cn, formatUsd, formatNumber } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { StatusAlerts } from './StatusAlerts';
import { PAINT_MAX_PIXELS } from './hooks/useDraftPaint';
import { useLiveTick } from '@/hooks/useLiveTick';
import { formatLiveCountdown } from '@/lib/formatLiveTime';

interface StatusStripProps {
  userId?: string;
  paintQueueSize?: number;
  isSpacePainting?: boolean;
  isFlushing?: boolean;
  draftCount?: number;
  onHeightChange?: (ref: HTMLElement | null) => void;
}

function formatLastSync(date: Date | null): string {
  if (!date) return 'Never';
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return date.toLocaleTimeString();
}

export function StatusStrip({ userId, paintQueueSize = 0, isSpacePainting = false, isFlushing = false, draftCount = 0, onHeightChange }: StatusStripProps) {
  const { isLoading, rebalanceActive, healthMultiplier, rebalanceEndsAt } = usePeBalance(userId);
  const { energy, refreshEnergy, needsSignature, signIn, isGoogleOnly, user } = useWallet();
  const { isOnCooldown, formatCooldown } = usePaintCooldown(energy.paintCooldownUntil);
  const now = useLiveTick();

  if (!userId) {
    return (
      <div 
        ref={onHeightChange}
        className="h-12 sm:h-11 glass-hud flex items-center justify-between px-4 py-0 border-t-0 rounded-none"
      >
        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          © 2026 Bitplace
          <span>·</span>
          <Link to="/privacy" className="hover:underline">Privacy Policy</Link>
          <span>·</span>
          <Link to="/terms" className="hover:underline">T&C</Link>
        </span>
        <span className="text-sm text-[var(--hud-text-muted)]">Connect your wallet to paint</span>
      </div>
    );
  }

  const healthPercent = Math.round(healthMultiplier * 100);
  const hasInsufficientPe = energy.peTotal < 1;
  const peUsed = energy.peUsed;
  const peAvailable = energy.peAvailable;

  return (
    <TooltipProvider>
      <div 
        ref={onHeightChange}
        className="min-h-12 sm:min-h-11 glass-hud flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 sm:gap-4 px-3 sm:px-4 py-2.5 sm:py-2 border-t-0 rounded-none safe-bottom-bar overflow-x-auto scrollbar-hide"
      >
        {/* Left side - BIT Balance & Cluster */}
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap sm:flex-nowrap">
          {/* Legal footer - desktop only */}
          <span className="hidden sm:flex items-center gap-1 text-xs font-medium text-muted-foreground">
            © 2026 Bitplace
            <span>·</span>
            <Link to="/privacy" className="hover:underline">Privacy</Link>
            <span>·</span>
            <Link to="/terms" className="hover:underline">T&C</Link>
          </span>

          {/* Draft Counter with limit */}
          {draftCount > 0 && (
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 border rounded-lg",
              draftCount >= PAINT_MAX_PIXELS 
                ? "bg-amber-500/10 border-amber-500/20" 
                : "bg-primary/10 border-primary/20"
            )}>
              <PixelIcon name="brush" className="h-3.5 w-3.5 text-foreground" />
              <span className={cn(
                "text-xs font-medium tabular-nums",
                draftCount >= PAINT_MAX_PIXELS ? "text-amber-600 dark:text-amber-400" : "text-foreground"
              )}>
                {draftCount.toLocaleString()}/{PAINT_MAX_PIXELS}
              </span>
            </div>
          )}
          
          {/* Paint Cooldown */}
          {isOnCooldown && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-destructive/10 border border-destructive/20 rounded-lg">
              <PixelIcon name="clock" className="h-3.5 w-3.5 text-destructive" />
              <span className="text-xs font-semibold text-destructive tabular-nums">
                {formatCooldown()}
              </span>
            </div>
          )}
          
          {/* Paint Queue Status (legacy) */}
          {(isSpacePainting || isFlushing) && draftCount === 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg animate-pulse">
              {isFlushing ? (
                <>
                  <PixelIcon name="loader" className="h-3.5 w-3.5 text-foreground animate-spin" />
                  <span className="text-xs font-medium text-foreground">Syncing...</span>
                </>
              ) : (
                <>
                  <PixelIcon name="brush" className="h-3.5 w-3.5 text-foreground" />
                  <span className="text-xs font-medium text-foreground tabular-nums">Painting {paintQueueSize}...</span>
                </>
              )}
            </div>
          )}

          {/* BIT Balance - hide for Google-only users */}
          {!isGoogleOnly && (
            <div className="flex items-center gap-2">
              <PixelIcon name="wallet" className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium tabular-nums leading-tight">
                {isLoading || energy.isRefreshing ? '...' : `${energy.nativeBalance.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} ${energy.nativeSymbol}`}
              </span>
              {energy.walletUsd > 0 && (
                <span className="text-xs text-muted-foreground">
                  ≈ ${formatUsd(energy.walletUsd)}
                </span>
              )}
            </div>
          )}

          {/* Cluster Badge */}
          {energy.cluster && (
            <span className={cn(
              "px-1.5 py-0.5 text-[10px] font-semibold uppercase rounded",
              energy.cluster === 'mainnet' 
                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                : "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
            )}>
              {energy.cluster === 'mainnet' ? 'LIVE' : energy.cluster}
            </span>
          )}

        </div>

        {/* Right side - Pixels first, then PE & Status */}
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap sm:flex-nowrap justify-end">
          {/* Pixel Balance — shown for virtual-only and 'both' users */}
          {(energy.isVirtualPe || (user?.auth_provider === 'both' && energy.virtualPeTotal > 0)) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 cursor-help">
                  <PixelBalanceIcon size="md" />
                  <span className="text-sm font-semibold tabular-nums leading-tight">
                    {isLoading ? '...' : energy.virtualPeAvailable.toLocaleString()}
                  </span>
                  {energy.virtualPeUsed > 0 && (
                    <span className="text-xs text-muted-foreground">
                      (used {energy.virtualPeUsed.toLocaleString()})
                    </span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-64 text-xs">
                Pixel Balance: your free pixel budget. Anyone can paint over these pixels.
              </TooltipContent>
            </Tooltip>
          )}

          {/* PE Total / Used — wallet users only */}
          {!energy.isVirtualPe && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 cursor-help">
                  <PEIcon size="md" className="text-foreground" />
                  <span className="text-sm font-semibold tabular-nums leading-tight">
                    {isLoading ? '...' : energy.peTotal.toLocaleString()}
                  </span>
                  {peUsed > 0 && (
                    <span className="text-xs text-muted-foreground">
                      (used {peUsed.toLocaleString()})
                    </span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-64 text-xs">
                Paint Energy (PE): your energy capacity based on your $BIT wallet value. 1 PE = $0.001.
              </TooltipContent>
            </Tooltip>
          )}

          {/* Available PE - smaller muted */}
          {!energy.isVirtualPe && peAvailable > 0 && peAvailable !== energy.peTotal && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>avail</span>
              <span className="tabular-nums">{peAvailable.toLocaleString()}</span>
            </div>
          )}




          {/* Status Alerts */}
          <StatusAlerts
            userId={userId} 
            onJumpToPixel={(x, y) => {
              window.dispatchEvent(new CustomEvent('bitplace:inspect', { detail: { x, y } }));
            }} 
          />

          {/* Rebalance status */}
          {rebalanceActive && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-destructive/10 border border-destructive/20 rounded-lg cursor-help">
                  <PixelIcon name="heart" className="h-3.5 w-3.5 text-destructive animate-pulse-soft" />
                  <span className="text-xs font-semibold text-destructive tabular-nums">{healthPercent}%</span>
                  {rebalanceEndsAt && (
                    <span className="text-xs text-muted-foreground tabular-nums">· {formatLiveCountdown(rebalanceEndsAt, now)}</span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-72 text-xs z-[9999] bg-popover border border-border shadow-lg p-3">
                <p className="font-semibold mb-2">Pixel Decay Active — {healthPercent}%</p>
                <p className="text-muted-foreground mb-2">
                  Stake is decaying because your wallet value is below what your pixels require.
                </p>
                <div className="space-y-1 tabular-nums text-muted-foreground">
                  <div className="flex justify-between gap-4">
                    <span>Wallet</span>
                    <span className="text-foreground">{energy.peTotal.toLocaleString()} PE <span className="text-muted-foreground">(${formatUsd(energy.peTotal * 0.01)})</span></span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Used in {energy.pixelsOwned} px</span>
                    <span className="text-foreground">{energy.pixelStakeTotal.toLocaleString()} PE <span className="text-muted-foreground">(${formatUsd(energy.pixelStakeTotal * 0.01)})</span></span>
                  </div>
                  {energy.pixelStakeTotal > energy.peTotal && (
                    <>
                      <div className="border-t border-border my-1" />
                      <div className="flex justify-between gap-4">
                        <span className="text-destructive font-medium">Deficit</span>
                        <span className="text-destructive font-medium">{(energy.pixelStakeTotal - energy.peTotal).toLocaleString()} PE <span className="font-normal">(${formatUsd((energy.pixelStakeTotal - energy.peTotal) * 0.01)})</span></span>
                      </div>
                    </>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Refresh Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshEnergy}
                disabled={energy.isRefreshing}
                className="h-10 w-10 sm:h-7 sm:w-auto sm:px-2 p-0 text-muted-foreground hover:text-foreground touch-target"
              >
                <PixelIcon name="refresh" className={cn("h-3.5 w-3.5", energy.isRefreshing && "animate-spin")} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <p>Last sync: {formatLastSync(energy.lastSyncAt)}</p>
              {energy.usdPrice > 0 && (
                <p className="text-muted-foreground">$BIT price: ${energy.usdPrice.toFixed(2)}</p>
              )}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
