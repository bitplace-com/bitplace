import { User, Flag, Users, Shield, Swords, Coins, RefreshCw, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { usePixelDetails } from '@/hooks/usePixelDetails';
import { cn } from '@/lib/utils';

interface PixelTabProps {
  x: number;
  y: number;
  currentUserId?: string;
}

function formatTimeUntil(targetTime: Date): string {
  const now = new Date();
  const diffMs = targetTime.getTime() - now.getTime();
  if (diffMs <= 0) return "Now";
  
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function PixelTab({ x, y, currentUserId }: PixelTabProps) {
  const { pixel, isLoading, refetch } = usePixelDetails(x, y);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!pixel) {
    return (
      <div className="text-center text-muted-foreground py-8 space-y-3">
        <p>Couldn't load pixel data</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-3 w-3 mr-1.5" />
          Retry
        </Button>
      </div>
    );
  }

  const isEmpty = !pixel.owner;
  const isOwnedByUser = pixel.owner?.id === currentUserId;

  return (
    <div className="space-y-4">
      {/* Coordinates */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Coordinates</span>
        <span className="font-mono">({x}, {y})</span>
      </div>

      {/* Owner Section */}
      <div className="bg-white/6 rounded-lg p-3 space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <User className="h-3 w-3" />
          <span>Owner</span>
        </div>
        
        {isEmpty ? (
          <div className="text-sm text-muted-foreground italic">
            Unclaimed pixel
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {pixel.color && (
                <div
                  className="h-4 w-4 rounded border border-white/14"
                  style={{ backgroundColor: pixel.color }}
                />
              )}
              <span className={cn(
                "text-sm font-medium",
                isOwnedByUser && "text-white"
              )}>
                {pixel.owner?.display_name || pixel.owner?.wallet_short || truncateWallet(pixel.owner?.id)}
                {isOwnedByUser && " (You)"}
              </span>
            </div>
            
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {pixel.owner?.country_code && (
                <div className="flex items-center gap-1">
                  <Flag className="h-3 w-3" />
                  <span>{pixel.owner.country_code}</span>
                </div>
              )}
              {pixel.owner?.alliance_tag && (
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  <span>[{pixel.owner.alliance_tag}]</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Stake & Value */}
      {!isEmpty && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/6 rounded-lg p-3">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <Coins className="h-3 w-3" />
                <span>Owner Stake</span>
              </div>
              <div className="text-lg font-semibold">
                {pixel.owner_stake_pe.toLocaleString()}
                <span className="text-xs text-muted-foreground ml-1">PE</span>
              </div>
            </div>
            
            <div className="bg-white/6 rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1">
                Pixel Value
              </div>
              <div className={cn(
                "text-lg font-semibold",
                pixel.vNow < 0 ? "text-destructive" : "text-foreground"
              )}>
                {pixel.vNow.toLocaleString()}
                <span className="text-xs text-muted-foreground ml-1">PE</span>
              </div>
            </div>
          </div>

          {/* DEF/ATK Breakdown */}
          <div className="grid grid-cols-2 gap-2">
            <ContributionCard
              icon={<Shield className="h-3 w-3" />}
              label="Defenders"
              total={pixel.defTotal}
              contributors={pixel.defenders}
              variant="defend"
            />
            <ContributionCard
              icon={<Swords className="h-3 w-3" />}
              label="Attackers"
              total={pixel.atkTotal}
              contributors={pixel.attackers}
              variant="attack"
            />
          </div>
        </>
      )}

      {/* Health Status (if owner is in rebalance) */}
      {!isEmpty && pixel.ownerRebalanceActive && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-amber-400">
              <AlertTriangle className="h-3 w-3" />
              <span>Owner Rebalancing</span>
            </div>
            <div className="text-sm font-semibold text-amber-400">
              {Math.round(pixel.ownerHealthMultiplier * 100)}% Health
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-amber-500 transition-all duration-300"
              style={{ width: `${pixel.ownerHealthMultiplier * 100}%` }}
            />
          </div>
          
          {/* Next tick info */}
          {pixel.nextTickTime && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                Next tick in: {formatTimeUntil(pixel.nextTickTime)}
              </span>
              {pixel.vFloorNext6h !== null && (
                <span className="text-muted-foreground">
                  V → {Math.floor(pixel.vFloorNext6h).toLocaleString()} PE
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Takeover Threshold */}
      <div className="bg-white/10 border border-white/20 rounded-lg p-3">
        <div className="text-xs text-white mb-1">
          {isEmpty ? 'Claim Cost' : 'Takeover Threshold'}
        </div>
        <div className="text-xl font-bold text-white">
          {pixel.thresholdWithFloor.toLocaleString()}
          <span className="text-sm font-normal ml-1">PE</span>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {isEmpty 
            ? 'PE required to claim this pixel'
            : pixel.isFloorBased
              ? 'Floor-based threshold (owner rebalancing)'
              : 'PE required to take over this pixel'
          }
        </div>
      </div>
    </div>
  );
}

interface ContributionCardProps {
  icon: React.ReactNode;
  label: string;
  total: number;
  contributors: { user_id: string; display_name: string | null; amount_pe: number }[];
  variant: 'defend' | 'attack';
}

function ContributionCard({ icon, label, total, contributors, variant }: ContributionCardProps) {
  const colorClass = variant === 'defend' 
    ? 'text-emerald-400' 
    : 'text-rose-400';

  return (
    <div className="bg-white/6 rounded-lg p-3">
      <div className={cn("flex items-center gap-1 text-xs mb-1", colorClass)}>
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-lg font-semibold">
        {total.toLocaleString()}
        <span className="text-xs text-muted-foreground ml-1">PE</span>
      </div>
      {contributors.length > 0 && (
        <div className="mt-2 space-y-1 max-h-20 overflow-y-auto">
          {contributors.slice(0, 5).map((c, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground truncate max-w-[80px]">
                {c.display_name || truncateWallet(c.user_id)}
              </span>
              <span className="font-mono">{c.amount_pe.toLocaleString()}</span>
            </div>
          ))}
          {contributors.length > 5 && (
            <div className="text-xs text-muted-foreground">
              +{contributors.length - 5} more
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function truncateWallet(address?: string | null): string {
  if (!address) return 'Unknown';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
