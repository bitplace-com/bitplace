import { Wallet, Heart, RefreshCw, Paintbrush, Loader2 } from 'lucide-react';
import { PEIcon } from '@/components/ui/pe-icon';
import { usePeBalance } from '@/hooks/usePeBalance';
import { useWallet } from '@/contexts/WalletContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { StatusAlerts } from './StatusAlerts';

interface StatusStripProps {
  userId?: string;
  paintQueueSize?: number;
  isSpacePainting?: boolean;
  isFlushing?: boolean;
  draftCount?: number;
}

function formatTimeRemaining(endsAt: Date): string {
  const now = new Date();
  const diff = endsAt.getTime() - now.getTime();
  if (diff <= 0) return 'ending...';
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
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

export function StatusStrip({ userId, paintQueueSize = 0, isSpacePainting = false, isFlushing = false, draftCount = 0 }: StatusStripProps) {
  // Use usePeBalance for rebalance status only
  const { isLoading, rebalanceActive, healthMultiplier, rebalanceEndsAt } = usePeBalance(userId);
  // Use WalletContext for PE totals (server truth)
  const { energy, refreshEnergy, needsSignature, signIn } = useWallet();

  if (!userId) {
    return (
      <div className="h-11 glass-hud flex items-center justify-center px-4 border-t-0 rounded-none">
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
      <div className="h-11 glass-hud flex items-center justify-between px-4 border-t-0 rounded-none safe-bottom overflow-x-auto scrollbar-hide">
        {/* Left side - SOL Balance & Cluster */}
        <div className="flex items-center gap-4">
          {/* Sign-in required pill */}
          {needsSignature && (
            <button
              onClick={() => signIn()}
              className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg hover:bg-amber-500/20 transition-colors cursor-pointer"
            >
              <Wallet className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Sign in required</span>
            </button>
          )}
          
          {/* Draft Counter */}
          {draftCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg">
              <Paintbrush className="h-3.5 w-3.5 text-foreground" />
              <span className="text-xs font-medium text-foreground tabular-nums">
                Draft: {draftCount.toLocaleString()} px
              </span>
            </div>
          )}
          
          {/* Paint Queue Status (legacy, will be removed) */}
          {(isSpacePainting || isFlushing) && draftCount === 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg animate-pulse">
              {isFlushing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 text-foreground animate-spin" />
                  <span className="text-xs font-medium text-foreground">Syncing...</span>
                </>
              ) : (
                <>
                  <Paintbrush className="h-3.5 w-3.5 text-foreground" />
                  <span className="text-xs font-medium text-foreground tabular-nums">Painting {paintQueueSize}...</span>
                </>
              )}
            </div>
          )}

          {/* SOL Balance */}
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium tabular-nums">
              {isLoading || energy.isRefreshing ? '...' : `${energy.nativeBalance.toFixed(4)} SOL`}
            </span>
            {energy.walletUsd > 0 && (
              <span className="text-xs text-muted-foreground">
                ≈ ${energy.walletUsd.toFixed(2)}
              </span>
            )}
          </div>

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

        {/* Right side - PE & Status */}
        <div className="flex items-center gap-4">
          {/* PE Total / Used */}
          <div className="flex items-center gap-2">
            <PEIcon size="md" className="text-foreground" />
            <span className="text-sm font-semibold tabular-nums">
              {isLoading ? '...' : energy.peTotal.toLocaleString()}
            </span>
            {peUsed > 0 && (
              <span className="text-xs text-muted-foreground">
                (used {peUsed.toLocaleString()})
              </span>
            )}
          </div>

          {/* Available PE - smaller muted */}
          {peAvailable > 0 && peAvailable !== energy.peTotal && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>avail</span>
              <span className="tabular-nums">{peAvailable.toLocaleString()}</span>
            </div>
          )}

          {/* Status Alerts - actionable chips for Lost/Under Attack/Contested */}
          <StatusAlerts 
            userId={userId} 
            onJumpToPixel={(x, y) => {
              window.dispatchEvent(new CustomEvent('bitplace:inspect', { detail: { x, y } }));
            }} 
          />

          {/* Rebalance status */}
          {rebalanceActive && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-destructive/10 border border-destructive/20 rounded-lg">
              <Heart className="h-3.5 w-3.5 text-destructive animate-pulse-soft" />
              <span className="text-xs font-semibold text-destructive tabular-nums">{healthPercent}%</span>
              {rebalanceEndsAt && (
                <span className="text-xs text-muted-foreground">· {formatTimeRemaining(rebalanceEndsAt)}</span>
              )}
            </div>
          )}

          {/* Refresh Button with tooltip */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshEnergy}
                disabled={energy.isRefreshing}
                className="h-7 px-2 text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", energy.isRefreshing && "animate-spin")} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <p>Last sync: {formatLastSync(energy.lastSyncAt)}</p>
              {energy.usdPrice > 0 && (
                <p className="text-muted-foreground">SOL price: ${energy.usdPrice.toFixed(2)}</p>
              )}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
