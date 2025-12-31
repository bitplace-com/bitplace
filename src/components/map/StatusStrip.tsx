import { Coins, Lock, Wallet, AlertTriangle, Heart } from 'lucide-react';
import { usePeBalance } from '@/hooks/usePeBalance';
import { cn } from '@/lib/utils';

interface StatusStripProps {
  userId?: string;
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

export function StatusStrip({ userId }: StatusStripProps) {
  const { total, locked, free, isLoading, rebalanceActive, healthMultiplier, rebalanceEndsAt, isContributionsUnderCollateralized } = usePeBalance(userId);

  if (!userId) {
    return (
      <div className="h-11 glass flex items-center justify-center px-4 border-t-0 rounded-none">
        <span className="text-sm text-muted-foreground">Connect wallet to see PE balance</span>
      </div>
    );
  }

  const isLowFree = free < total * 0.1;
  const healthPercent = Math.round(healthMultiplier * 100);

  return (
    <div className="h-11 glass flex items-center justify-between px-4 border-t-0 rounded-none">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-primary" />
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Total</span>
          <span className="text-sm font-semibold tabular-nums">{isLoading ? '...' : total.toLocaleString()} PE</span>
        </div>
        <div className="flex items-center gap-2" title="PE staked in owned pixels + contributions">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Locked</span>
          <span className="text-sm font-medium tabular-nums">{isLoading ? '...' : locked.toLocaleString()} PE</span>
        </div>
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Free</span>
          <span className={cn("text-sm font-medium tabular-nums", isLowFree && "text-destructive")}>{isLoading ? '...' : free.toLocaleString()} PE</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {isContributionsUnderCollateralized && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs font-medium text-amber-600">DEF/ATK at risk</span>
          </div>
        )}

        {rebalanceActive && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-destructive/10 border border-destructive/20 rounded-lg">
            <Heart className="h-3.5 w-3.5 text-destructive animate-pulse-soft" />
            <span className="text-xs font-semibold text-destructive tabular-nums">{healthPercent}%</span>
            {rebalanceEndsAt && (
              <span className="text-xs text-muted-foreground">· {formatTimeRemaining(rebalanceEndsAt)}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
