import { Coins, Lock, Wallet } from 'lucide-react';
import { usePeBalance } from '@/hooks/usePeBalance';
import { cn } from '@/lib/utils';

interface StatusStripProps {
  userId?: string;
}

export function StatusStrip({ userId }: StatusStripProps) {
  const { total, locked, free, isLoading } = usePeBalance(userId);

  if (!userId) {
    return (
      <div className="h-10 bg-muted/50 border-t border-border flex items-center justify-center px-4">
        <span className="text-sm text-muted-foreground">
          Connect wallet to see PE balance
        </span>
      </div>
    );
  }

  const isLowFree = free < total * 0.1;

  return (
    <div className="h-10 bg-background/95 backdrop-blur-sm border-t border-border flex items-center justify-between px-4">
      <div className="flex items-center gap-6">
        {/* Total */}
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-primary" />
          <span className="text-sm text-muted-foreground">Total:</span>
          <span className="text-sm font-medium">
            {isLoading ? '...' : total.toLocaleString()} PE
          </span>
        </div>

        {/* Locked */}
        <div className="flex items-center gap-2" title="PE staked in owned pixels + contributions">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Locked:</span>
          <span className="text-sm font-medium">
            {isLoading ? '...' : locked.toLocaleString()} PE
          </span>
        </div>

        {/* Free */}
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Free:</span>
          <span className={cn(
            "text-sm font-medium",
            isLowFree && "text-destructive"
          )}>
            {isLoading ? '...' : free.toLocaleString()} PE
          </span>
        </div>
      </div>
    </div>
  );
}
