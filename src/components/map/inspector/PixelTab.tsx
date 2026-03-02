import { useState } from 'react';
import { User, Shield, Swords, RefreshCw, AlertTriangle, ArrowUpFromLine, Loader2 } from 'lucide-react';
import { useLiveTick } from '@/hooks/useLiveTick';
import { formatLiveCountdown } from '@/lib/formatLiveTime';
import { PixelIcon } from '@/components/icons';
import { getCountryByCode } from '@/lib/countries';
import { PEIcon } from '@/components/ui/pe-icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { usePixelDetails } from '@/hooks/usePixelDetails';
import { useWithdrawContribution } from '@/hooks/useWithdrawContribution';
import { cn } from '@/lib/utils';

interface PixelTabProps {
  x: number;
  y: number;
  currentUserId?: string;
  hideWithdraw?: boolean;
}

function formatTimeUntil(targetTime: Date, nowMs: number): string {
  const diffMs = targetTime.getTime() - nowMs;
  if (diffMs <= 0) return "Now";
  return formatLiveCountdown(targetTime, nowMs);
}

export function PixelTab({ x, y, currentUserId, hideWithdraw = false }: PixelTabProps) {
  const { pixel, isLoading, refetch } = usePixelDetails(x, y, currentUserId);
  const { isCommitting, commit } = useWithdrawContribution();
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const now = useLiveTick();

  const handleWithdraw = async () => {
    if (hideWithdraw) return;
    setIsWithdrawing(true);
    try {
      const result = await commit([{ x, y }]);
      if (result?.ok) {
        refetch();
      }
    } finally {
      setIsWithdrawing(false);
    }
  };

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

  // Syncing state - show partial data with indicator
  if (pixel.isSyncing) {
    return (
      <div className="space-y-4">
        {/* Coordinates */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Coordinates</span>
          <span className="font-mono">({x}, {y})</span>
        </div>

        {/* Syncing indicator */}
        <div className="bg-muted/50 rounded-lg p-3 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Syncing...</span>
        </div>

        {/* Color preview if available */}
        {pixel.color && (
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded border border-white/14" style={{ backgroundColor: pixel.color }} />
              <span className="text-sm font-mono">{pixel.color}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  const isEmpty = !pixel.owner;
  const isOwnedByUser = pixel.owner?.id === currentUserId;

  return (
    <div className="space-y-4">
      {/* Owner Section */}
      <div className="bg-muted/50 rounded-lg p-3 space-y-2">
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
                isOwnedByUser && "text-primary"
              )}>
                {pixel.owner?.display_name || pixel.owner?.wallet_short || truncateWallet(pixel.owner?.id)}
                {isOwnedByUser && " (You)"}
              </span>
            </div>
            
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {pixel.owner?.country_code && (() => {
                const country = getCountryByCode(pixel.owner.country_code);
                return country ? (
                  <div className="flex items-center gap-1">
                    <span>{country.flag}</span>
                    <span>{country.name}</span>
                  </div>
                ) : null;
              })()}
              {pixel.owner?.alliance_tag && (
                <div className="flex items-center gap-1">
                  <PixelIcon name="usersCrown" size="xs" />
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
          {/* Expiry Countdown for virtual-staked pixels */}
          {pixel.expiresAt && (() => {
            const remaining = pixel.expiresAt.getTime() - now;
            if (remaining <= 0) return (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-center gap-2">
                <PixelIcon name="clock" className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium text-destructive">Expired</span>
              </div>
            );
            return (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  <PixelIcon name="clock" className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium text-amber-500">
                    Expires in {formatLiveCountdown(pixel.expiresAt, now)}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Add real PE (DEF) to make this pixel permanent
                </p>
              </div>
            );
          })()}

          {/* Protected badge for virtual-staked pixels that have been DEFed */}
          {pixel.isVirtualStake && !pixel.expiresAt && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 flex items-center gap-2">
              <PixelIcon name="shield" className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-medium text-emerald-500">Protected</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-muted/50 rounded-lg p-3">
               <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <PEIcon size="xs" />
                <span>PE Owner</span>
              </div>
              <div className="text-lg font-semibold">
                {pixel.owner_stake_pe.toLocaleString()}
                <span className="text-xs text-muted-foreground ml-1">PE</span>
              </div>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-3">
               <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <PEIcon size="xs" />
                <span>PE Total Stake</span>
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

          {/* User's Contribution Section (read-only when hideWithdraw is true) */}
          {pixel.myContribution && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {pixel.myContribution.side === 'DEF' ? (
                    <Shield className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Swords className="h-4 w-4 text-rose-400" />
                  )}
                  <span className="text-sm font-medium">
                    Your {pixel.myContribution.side}: {pixel.myContribution.amount_pe.toLocaleString()} PE
                  </span>
                </div>
              </div>
              {!hideWithdraw && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full"
                  onClick={handleWithdraw}
                  disabled={isWithdrawing || isCommitting}
                >
                  {isWithdrawing ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <ArrowUpFromLine className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Withdraw
                </Button>
              )}
            </div>
          )}
        </>
      )}

      {/* Health Status (if owner is in rebalance) */}
      {!isEmpty && pixel.ownerRebalanceActive && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-medium text-amber-400">
              <AlertTriangle className="h-3 w-3" />
              <span>Stake Decaying</span>
            </div>
            <div className="text-sm font-semibold text-amber-400">
              {Math.round(pixel.ownerHealthMultiplier * 100)}%
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-amber-500 transition-all duration-300"
              style={{ width: `${pixel.ownerHealthMultiplier * 100}%` }}
            />
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Owner's PE is losing value every tick until wallet is topped up.
          </p>
          
          {pixel.nextTickTime && (
            <div className="text-xs space-y-0.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Next tick</span>
                <span className="font-mono tabular-nums">{formatTimeUntil(pixel.nextTickTime, now)}</span>
              </div>
              {pixel.vFloorNext6h !== null && (
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Value after tick</span>
                  <span className="font-mono tabular-nums">{Math.floor(pixel.vFloorNext6h).toLocaleString()} PE</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

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
    <div className="bg-muted/50 rounded-lg p-3">
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
