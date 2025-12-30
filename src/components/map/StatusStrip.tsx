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
  const { total, locked, free, isLoading, rebalanceActive, healthMultiplier, rebalanceEndsAt } = usePeBalance(userId);

  if (!userId) {
    return (
      <div className="h-10 bg-muted/50 border-t border-border flex items-center justify-center px-4">
        <span className="text-sm text-muted-foreground">Connect wallet to see PE balance</span>
      </div>
    );
  }

  const isLowFree = free < total * 0.1;
  const healthPercent = Math.round(healthMultiplier * 100);

  return (
    <div className="h-10 bg-background/95 backdrop-blur-sm border-t border-border flex items-center justify-between px-4">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-primary" />
          <span className="text-sm text-muted-foreground">Total:</span>
          <span className="text-sm font-medium">{isLoading ? '...' : total.toLocaleString()} PE</span>
        </div>
        <div className="flex items-center gap-2" title="PE staked in owned pixels + contributions">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Locked:</span>
          <span className="text-sm font-medium">{isLoading ? '...' : locked.toLocaleString()} PE</span>
        </div>
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Free:</span>
          <span className={cn("text-sm font-medium", isLowFree && "text-destructive")}>{isLoading ? '...' : free.toLocaleString()} PE</span>
        </div>
      </div>

      {rebalanceActive && (
        <div className="flex items-center gap-2 px-3 py-1 bg-destructive/10 border border-destructive/20 rounded-md">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <Heart className="h-3 w-3 text-destructive" />
          <span className="text-sm font-medium text-destructive">{healthPercent}%</span>
          {rebalanceEndsAt && (
            <span className="text-xs text-muted-foreground">ends in {formatTimeRemaining(rebalanceEndsAt)}</span>
          )}
        </div>
      )}
    </div>
  );
}
