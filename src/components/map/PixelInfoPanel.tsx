import { useState, useCallback } from 'react';
import { X, RefreshCw, AlertTriangle, Globe, Expand, Loader2 } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { PEIcon } from '@/components/ui/pe-icon';
import { ProBadge } from '@/components/ui/pro-badge';
import { AdminBadge } from '@/components/ui/admin-badge';
import { getProTier, isAdmin } from '@/lib/userBadges';
import { toast } from 'sonner';

import { GlassPanel } from '@/components/ui/glass-panel';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { UserMinimap } from '@/components/UserMinimap';
import { OwnerArtworkModal } from './OwnerArtworkModal';
import { usePixelDetails } from '@/hooks/usePixelDetails';
import { AvatarFallback } from '@/components/ui/avatar-fallback-pattern';
import { getCountryByCode } from '@/lib/countries';
import { cn } from '@/lib/utils';
import { PixelIcon } from '@/components/icons/PixelIcon';

interface PixelInfoPanelProps {
  x: number;
  y: number;
  onClose: () => void;
  currentUserId?: string;
  actionSelectionCount?: number;
  onJumpToPixel?: (x: number, y: number) => void;
}

function formatTimeUntil(targetTime: Date): string {
  const now = new Date();
  const diffMs = targetTime.getTime() - now.getTime();
  if (diffMs <= 0) return 'Now';
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function peToUsd(pe: number): string {
  const usd = pe * 0.001;
  return `~$${usd < 0.01 ? usd.toFixed(3) : usd.toFixed(2)}`;
}

interface AllianceStats {
  name: string;
  tag: string;
  member_count: number;
  total_pixels: number;
  total_pe_staked: number;
}

function AllianceTagBadge({ tag }: { tag: string }) {
  const [stats, setStats] = useState<AllianceStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const fetchStats = useCallback(async () => {
    if (fetched) return;
    setLoading(true);
    setFetched(true);
    const { data } = await supabase.rpc('get_alliance_stats_by_tag', { tag_input: tag });
    if (data && data.length > 0) {
      setStats(data[0] as unknown as AllianceStats);
    }
    setLoading(false);
  }, [tag, fetched]);

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="text-[10px] font-medium px-1 py-0.5 rounded bg-muted text-foreground/80 border border-border/50 w-fit cursor-pointer"
            onPointerDown={fetchStats}
            onMouseEnter={fetchStats}
          >
            [{tag}]
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="p-0 bg-popover border-border w-48">
          {loading ? (
            <div className="p-3 flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : stats ? (
            <div className="p-3 space-y-2">
              <div className="font-medium text-xs">
                {stats.name} <span className="text-muted-foreground">[{stats.tag}]</span>
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Members</span>
                  <span className="font-medium">{stats.member_count.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pixels</span>
                  <span className="font-medium">{stats.total_pixels.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">PE Staked</span>
                  <span className="font-medium">{stats.total_pe_staked.toLocaleString()} PE</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Value</span>
                  <span className="font-medium text-emerald-500">{peToUsd(stats.total_pe_staked)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 text-xs text-muted-foreground">No data</div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function PixelInfoPanel({
  x,
  y,
  onClose,
  currentUserId,
  actionSelectionCount = 0,
  onJumpToPixel,
}: PixelInfoPanelProps) {
  const { pixel, isLoading, refetch } = usePixelDetails(x, y, currentUserId);
  const [artworkModalOpen, setArtworkModalOpen] = useState(false);

  const handleJumpToPixel = (targetX: number, targetY: number) => {
    if (onJumpToPixel) onJumpToPixel(targetX, targetY);
  };

  const isOwned = pixel !== null && pixel.owner !== null;
  const isOwnPixel = pixel?.owner?.id === currentUserId;
  const country = pixel?.owner?.country_code ? getCountryByCode(pixel.owner.country_code) : null;

  // Takeover cost
  const takeoverCost = pixel ? (isOwnPixel ? 0 : pixel.isFloorBased ? pixel.thresholdWithFloor : pixel.threshold) : 1;

  return (
    <>
      <GlassPanel
        variant="hud-strong"
        className="w-80 max-w-[calc(100vw-1.5rem)] max-h-[70vh] overflow-hidden flex flex-col"
        padding="none"
      >
        {/* Header — color dot + status + close */}
        <div className="px-3 py-2.5 border-b border-border/50 shrink-0 flex items-center gap-2">
          <div
            className="w-4 h-4 rounded-sm border border-border/50 shrink-0"
            style={{ backgroundColor: pixel?.color || '#888888' }}
          />
          {/* Contextual status */}
          {pixel && isOwned && (
            <span className="flex items-center gap-1 text-xs font-medium truncate flex-1">
              {isOwnPixel ? (
                <>
                  <span className="text-primary truncate">You own this pixel</span>
                </>
              ) : pixel.myContribution?.side === 'DEF' ? (
                <>
                  <PixelIcon name="shield" className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="text-emerald-500 truncate">You're defending</span>
                </>
              ) : pixel.myContribution?.side === 'ATK' ? (
                <>
                  <PixelIcon name="swords" className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span className="text-rose-500 truncate">You're attacking</span>
                </>
              ) : null}
            </span>
          )}
          {pixel && isOwned && !isOwnPixel && !pixel.myContribution && (
            <span className="flex items-center gap-1 text-xs font-medium truncate flex-1">
              <span className="text-muted-foreground truncate">Owned by {pixel.owner?.display_name || pixel.owner?.wallet_short || 'someone'}</span>
            </span>
          )}
          {!(pixel && isOwned) && <span className="flex-1" />}
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-accent/80 transition-colors shrink-0"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
          ) : !pixel ? (
            <div className="flex flex-col items-center py-6 gap-3">
              <p className="text-sm text-muted-foreground">Couldn't load pixel data</p>
              <Button size="sm" variant="outline" onClick={() => refetch()}>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Retry
              </Button>
            </div>
          ) : pixel.isSyncing ? (
            <div className="flex flex-col items-center py-6 gap-3">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-8 h-8 rounded-lg border border-border/50"
                  style={{ backgroundColor: pixel.color || '#888888' }}
                />
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
              <div className="text-center">
                <span className="text-sm font-medium block flex items-center justify-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Syncing...
                </span>
                <span className="text-xs text-muted-foreground mt-1 block">
                  Owner details will appear shortly
                </span>
              </div>
            </div>
          ) : !isOwned ? (
            /* Unclaimed Pixel */
            <div className="flex flex-col items-center py-8 gap-4">
              <div className="w-14 h-14 rounded-xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted/50">
                <PixelIcon name="plus" className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="text-center space-y-1">
                <span className="text-sm font-medium block">Available to paint</span>
                <span className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  1 <PEIcon size="xs" /> <span className="text-muted-foreground/60">({peToUsd(1)})</span>
                </span>
              </div>
            </div>
          ) : (
            /* Owned Pixel */
            <>
              {/* ── Owner Section ── */}
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  {pixel.owner?.avatar_url ? (
                    <img
                      src={pixel.owner.avatar_url}
                      alt="Avatar"
                      className="w-10 h-10 rounded-lg object-cover shrink-0"
                    />
                  ) : (
                    <AvatarFallback
                      seed={pixel.owner?.id || 'unknown'}
                      name={pixel.owner?.display_name}
                      wallet={pixel.owner?.wallet_short}
                      className="w-10 h-10 rounded-lg shrink-0"
                      textClassName="text-sm"
                    />
                  )}

                  <div className="min-w-0 flex-1 space-y-1">
                    {/* Name + Level + Alliance + Badges */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={cn(
                        'font-medium text-sm truncate max-w-[140px]',
                        isOwnPixel ? 'text-primary' : 'text-foreground'
                      )}>
                        {pixel.owner?.display_name || pixel.owner?.wallet_short || 'Anonymous'}
                      </span>
                      {isOwnPixel && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">You</span>
                      )}
                      {isAdmin(pixel.owner?.wallet_short) && <AdminBadge />}
                      {(() => { const tier = getProTier(pixel.owner?.total_staked_pe ?? 0); return tier ? <ProBadge tier={tier} /> : null; })()}
                    </div>
                  {pixel.owner?.alliance_tag && (
                      <AllianceTagBadge tag={pixel.owner.alliance_tag} />
                    )}

                    {/* Wallet + Country */}
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      {pixel.owner?.wallet_short && (
                        <span className="font-mono">{pixel.owner.wallet_short}</span>
                      )}
                      {country && (
                        <span className="flex items-center gap-0.5">
                          <span>{country.flag}</span>
                          <span>{country.name}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bio */}
                {pixel.owner?.bio && (
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {pixel.owner.bio}
                  </p>
                )}

                {/* Social Links */}
                {(pixel.owner?.social_x || pixel.owner?.social_instagram || pixel.owner?.social_discord || pixel.owner?.social_website) && (
                  <div className="flex items-center gap-1.5">
                    {pixel.owner.social_x && (
                      <a href={pixel.owner.social_x} target="_blank" rel="noopener noreferrer"
                        className="p-1 rounded hover:bg-accent transition-colors">
                        <PixelIcon name="twitter" className="w-3.5 h-3.5 text-muted-foreground" />
                      </a>
                    )}
                    {pixel.owner.social_instagram && (
                      <a href={pixel.owner.social_instagram} target="_blank" rel="noopener noreferrer"
                        className="p-1 rounded hover:bg-accent transition-colors">
                        <PixelIcon name="instagram" className="w-3.5 h-3.5 text-muted-foreground" />
                      </a>
                    )}
                    {pixel.owner.social_discord && (
                      <a href={pixel.owner.social_discord.startsWith('http') ? pixel.owner.social_discord : `https://discord.gg/${pixel.owner.social_discord}`} target="_blank" rel="noopener noreferrer"
                        className="p-1 rounded hover:bg-accent transition-colors">
                        <PixelIcon name="discord" className="w-3.5 h-3.5 text-muted-foreground" />
                      </a>
                    )}
                    {pixel.owner.social_website && (
                      <a href={pixel.owner.social_website} target="_blank" rel="noopener noreferrer"
                        className="p-1 rounded hover:bg-accent transition-colors">
                        <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                      </a>
                    )}
                  </div>
                )}
               </div>

               {/* ── Owner Stats ── */}
               <div className="flex items-center gap-2 text-xs">
                 <div className="flex-1 bg-muted/70 rounded-lg px-2.5 py-2 text-center">
                   <div className="font-semibold text-foreground">{(pixel.owner?.pixels_painted_total ?? 0).toLocaleString()}</div>
                   <div className="text-[10px] text-muted-foreground">Pixels</div>
                 </div>
                 <div className="flex-1 bg-muted/70 rounded-lg px-2.5 py-2 text-center">
                   <div className="font-semibold text-foreground flex items-center justify-center gap-0.5">
                     {(pixel.owner?.total_staked_pe ?? 0).toLocaleString()} <PEIcon size="xs" />
                   </div>
                   <div className="text-[10px] text-muted-foreground">Staked</div>
                 </div>
                 <div className="flex-1 bg-muted/70 rounded-lg px-2.5 py-2 text-center">
                   <div className="font-semibold text-emerald-500">{peToUsd(pixel.owner?.total_staked_pe ?? 0)}</div>
                   <div className="text-[10px] text-muted-foreground">Value</div>
                 </div>
               </div>

               {/* ── Pixel Economy ── */}
              <div className="bg-muted/70 rounded-lg p-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {/* Owner Stake */}
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <PEIcon size="xs" /> Owner Stake
                    </span>
                    <div className="text-sm font-semibold">{pixel.owner_stake_pe.toLocaleString()} PE</div>
                    <div className="text-[10px] text-emerald-500">{peToUsd(pixel.owner_stake_pe)}</div>
                  </div>
                  {/* Total Stake */}
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <PEIcon size="xs" /> Total Stake
                    </span>
                    <div className={cn('text-sm font-semibold', pixel.vNow < 0 && 'text-destructive')}>
                      {pixel.vNow.toLocaleString()} PE
                    </div>
                    <div className="text-[10px] text-emerald-500">{peToUsd(pixel.vNow)}</div>
                  </div>
                </div>

                {/* DEF / ATK row */}
                <div className="flex items-center justify-center gap-4 pt-1 border-t border-border/40">
                  <span className="text-xs text-emerald-500 flex items-center gap-1 font-medium">
                    <PixelIcon name="shield" className="w-3 h-3" />
                    DEF +{pixel.defTotal.toLocaleString()}
                  </span>
                  <span className="text-xs text-rose-500 flex items-center gap-1 font-medium">
                    <PixelIcon name="swords" className="w-3 h-3" />
                    ATK -{pixel.atkTotal.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* ── Takeover / Claim Cost ── */}
              {!isOwnPixel && (
                <div className="bg-muted/70 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Takeover Cost</span>
                    <div className="text-right">
                      <span className="text-sm font-semibold flex items-center gap-1">
                        {takeoverCost.toLocaleString()} <PEIcon size="xs" />
                      </span>
                      <span className="text-[10px] text-muted-foreground block">{peToUsd(takeoverCost)}</span>
                    </div>
                  </div>
                  {pixel.isFloorBased && (
                    <span className="text-[10px] text-amber-500 mt-1.5 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Floor-based (stake decaying)
                    </span>
                  )}
                </div>
              )}

              {/* ── Rebalancing (Stake Decaying) ── */}
              {pixel.ownerRebalanceActive && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
                      <AlertTriangle className="w-3 h-3" />
                      Stake Decaying
                    </span>
                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                      {Math.round(pixel.ownerHealthMultiplier * 100)}%
                    </span>
                  </div>
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 transition-all"
                      style={{ width: `${pixel.ownerHealthMultiplier * 100}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Owner's stake is losing value every tick until wallet is topped up.
                  </p>
                  {(pixel.nextTickTime || pixel.vFloorNext6h !== null) && (
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-amber-500/20">
                      {pixel.nextTickTime && (
                        <span className="text-muted-foreground">
                          Next tick: <span className="font-mono tabular-nums font-medium text-foreground">{formatTimeUntil(pixel.nextTickTime)}</span>
                        </span>
                      )}
                      {pixel.vFloorNext6h !== null && (
                        <span className="text-muted-foreground">
                          Value after: <span className="font-mono tabular-nums font-medium text-foreground">{Math.floor(pixel.vFloorNext6h)} PE</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}


              {/* ── Artwork ── */}
              {pixel.owner?.id && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <PixelIcon name="brush" className="w-3 h-3" />
                       Paints
                    </span>
                    <button
                      onClick={() => setArtworkModalOpen(true)}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors"
                    >
                      <Expand className="w-3 h-3" />
                      Expand
                    </button>
                  </div>
                  <UserMinimap
                    userId={pixel.owner.id}
                    height="5rem"
                    showEmptyState={false}
                    className="rounded-lg"
                  />
                </div>
              )}
            </>
          )}
        </div>
      </GlassPanel>

      {/* Artwork Modal */}
      {pixel?.owner?.id && (
        <OwnerArtworkModal
          open={artworkModalOpen}
          onOpenChange={setArtworkModalOpen}
          userId={pixel.owner.id}
          ownerName={pixel.owner.display_name}
          onJumpToPixel={handleJumpToPixel}
        />
      )}
    </>
  );
}
