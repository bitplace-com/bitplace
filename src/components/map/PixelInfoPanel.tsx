import { useState } from 'react';
import { Copy, X, Share2, RefreshCw, AlertTriangle, Globe, Flag, Calendar, Expand, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { PEIcon } from '@/components/ui/pe-icon';
import { toast } from 'sonner';

import { GlassPanel } from '@/components/ui/glass-panel';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { UserMinimap } from '@/components/UserMinimap';
import { LevelPill } from '@/components/ui/level-pill';
import { OwnerArtworkModal } from './OwnerArtworkModal';
import { usePixelDetails } from '@/hooks/usePixelDetails';
import { generateAvatarGradient, getAvatarInitial } from '@/lib/avatar';
import { getCountryByCode } from '@/lib/countries';
import { getColorName } from '@/lib/colorNames';
import { copyPixelCoords, copyPixelLink } from '@/lib/shareLink';
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

  const handleCopyCoords = async () => {
    const success = await copyPixelCoords(x, y);
    if (success) toast.success('Coordinates copied!');
    else toast.error('Failed to copy');
  };

  const handleShare = async () => {
    const success = await copyPixelLink(x, y);
    if (success) toast.success('Link copied!');
    else toast.error('Failed to copy');
  };

  const handleReport = () => {
    toast.info('Report feature coming soon');
  };

  const handleJumpToPixel = (targetX: number, targetY: number) => {
    if (onJumpToPixel) {
      onJumpToPixel(targetX, targetY);
    }
  };

  const isOwned = pixel !== null && pixel.owner !== null;
  const isOwnPixel = pixel?.owner?.id === currentUserId;
  const country = pixel?.owner?.country_code ? getCountryByCode(pixel.owner.country_code) : null;
  const colorName = getColorName(pixel?.color);

  return (
    <>
      <GlassPanel 
        variant="hud-strong" 
        className="w-80 max-w-[calc(100vw-1.5rem)] max-h-[70vh] overflow-hidden flex flex-col" 
        padding="none"
      >
        {/* Header */}
        <div className="px-3 py-2.5 border-b border-border/50 shrink-0">
          <div className="flex items-start justify-between gap-2">
            {/* Left: Color dot + name */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div
                className="w-3 h-3 rounded-sm shrink-0 border border-border/50"
                style={{ backgroundColor: pixel?.color || '#888888' }}
              />
              <span className="text-sm font-medium truncate">
                {isOwned ? `${colorName} pixel` : 'Unclaimed pixel'}
              </span>
            </div>
            
            {/* Right: Actions */}
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                onClick={handleShare}
                className="p-1.5 rounded hover:bg-accent/80 transition-colors"
                title="Share"
              >
                <Share2 className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <button
                onClick={handleReport}
                className="p-1.5 rounded hover:bg-accent/80 transition-colors"
                title="Report"
              >
                <Flag className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <button
                onClick={handleCopyCoords}
                className="p-1.5 rounded hover:bg-accent/80 transition-colors"
                title="Copy coordinates"
              >
                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded hover:bg-accent/80 transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>
          
          {/* Coordinates line */}
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground font-mono">
            <span>X: {x.toLocaleString()}</span>
            <span>Y: {y.toLocaleString()}</span>
            {actionSelectionCount > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium font-sans">
                +{actionSelectionCount}
              </span>
            )}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-3 py-2.5 space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-16" />
              </div>
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-24 w-full" />
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
            /* Syncing state - partial data visible */
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
            <div className="flex flex-col items-center py-6 gap-3">
              <div className="w-14 h-14 rounded-xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted/50">
                <PixelIcon name="plus" className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="text-center">
                <span className="text-sm font-medium block">Available to claim</span>
                <span className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                  Cost: 1 <PEIcon size="xs" />
                </span>
              </div>
            </div>
          ) : (
            /* Owned Pixel */
            <>
              {/* Chips Row */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {country && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted/80 text-xs">
                    <span>{country.flag}</span>
                    <span className="text-muted-foreground">{country.name}</span>
                  </span>
                )}
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted/80 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {pixel.x !== undefined ? formatDistanceToNow(new Date(), { addSuffix: true }) : 'Unknown'}
                </span>
              </div>

              {/* Owner Row */}
              <div className="flex items-start gap-2.5">
                {/* Avatar */}
                {pixel.owner?.avatar_url ? (
                  <img
                    src={pixel.owner.avatar_url}
                    alt="Avatar"
                    className="w-9 h-9 rounded-lg object-cover shrink-0"
                  />
                ) : (
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-semibold text-sm shrink-0"
                    style={{ background: generateAvatarGradient(pixel.owner?.id || 'unknown') }}
                  >
                    {getAvatarInitial(pixel.owner?.display_name, pixel.owner?.wallet_short)}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  {/* Name + Level + Alliance */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={cn(
                      'font-medium text-sm truncate max-w-[120px]',
                      isOwnPixel ? 'text-primary' : 'text-foreground'
                    )}>
                      {pixel.owner?.display_name || pixel.owner?.wallet_short || 'Anonymous'}
                      {isOwnPixel && ' (You)'}
                    </span>
                    {pixel.owner && <LevelPill level={pixel.owner.owner_health_multiplier >= 1 ? 1 : 1} size="xs" />}
                    {pixel.owner?.alliance_tag && (
                      <span className="text-[10px] font-medium px-1 py-0.5 rounded bg-accent text-accent-foreground">
                        [{pixel.owner.alliance_tag}]
                      </span>
                    )}
                  </div>

                  {/* Wallet */}
                  {pixel.owner?.wallet_short && (
                    <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                      {pixel.owner.wallet_short}
                    </div>
                  )}

                  {/* Social Links */}
                  {(pixel.owner?.social_x || pixel.owner?.social_instagram || pixel.owner?.social_website) && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {pixel.owner.social_x && (
                        <a
                          href={pixel.owner.social_x}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded hover:bg-accent transition-colors"
                        >
                          <PixelIcon name="twitter" className="w-3 h-3 text-muted-foreground" />
                        </a>
                      )}
                      {pixel.owner.social_instagram && (
                        <a
                          href={pixel.owner.social_instagram}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded hover:bg-accent transition-colors"
                        >
                          <PixelIcon name="instagram" className="w-3 h-3 text-muted-foreground" />
                        </a>
                      )}
                      {pixel.owner.social_website && (
                        <a
                          href={pixel.owner.social_website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded hover:bg-accent transition-colors"
                        >
                          <Globe className="w-3 h-3 text-muted-foreground" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Economy Section - Compact 2-column grid */}
              <div className="bg-muted/50 rounded-lg p-2.5">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Owner Stake</span>
                    <span className="font-medium flex items-center gap-0.5">
                      {pixel.owner_stake_pe.toLocaleString()} <PEIcon size="xs" />
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">V_now</span>
                    <span className={cn(
                      'font-semibold flex items-center gap-0.5',
                      pixel.vNow < 0 && 'text-destructive'
                    )}>
                      {pixel.vNow.toLocaleString()} <PEIcon size="xs" />
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-500 flex items-center gap-0.5">
                      <PixelIcon name="shield" className="w-3 h-3" /> DEF
                    </span>
                    <span className="font-medium text-emerald-500">
                      +{pixel.defTotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-rose-500 flex items-center gap-0.5">
                      <PixelIcon name="swords" className="w-3 h-3" /> ATK
                    </span>
                    <span className="font-medium text-rose-500">
                      -{pixel.atkTotal.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Floor + Next tick (if rebalancing) */}
                {pixel.ownerRebalanceActive && pixel.vFloorNext6h !== null && (
                  <div className="mt-2 pt-2 border-t border-border/50 grid grid-cols-2 gap-x-4 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">V_floor (6h)</span>
                      <span className="font-medium flex items-center gap-0.5">
                        {Math.floor(pixel.vFloorNext6h).toLocaleString()} <PEIcon size="xs" />
                      </span>
                    </div>
                    {pixel.nextTickTime && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Next tick</span>
                        <span className="font-medium">{formatTimeUntil(pixel.nextTickTime)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Owner Health (if rebalancing) */}
              {pixel.ownerRebalanceActive && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Rebalancing
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
                </div>
              )}

              {/* Owner Artwork Preview */}
              {pixel.owner?.id && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <PixelIcon name="brush" className="w-3 h-3" />
                      Owner's Artwork
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

              {/* My Involvement */}
              {(pixel.myContribution || isOwnPixel) && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-2.5 space-y-1.5">
                  <span className="text-xs font-medium text-foreground">Your Involvement</span>
                  <div className="flex flex-col gap-1 text-xs">
                    {pixel.myContribution && (
                      <div className="flex items-center gap-1.5">
                        {pixel.myContribution.side === 'DEF' ? (
                          <PixelIcon name="shield" className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <PixelIcon name="swords" className="w-3.5 h-3.5 text-rose-500" />
                        )}
                        <span>
                          {pixel.myContribution.side}:
                          <span className="font-semibold ml-1">
                            {pixel.myContribution.amount_pe.toLocaleString()} PE
                          </span>
                        </span>
                      </div>
                    )}
                    {isOwnPixel && (
                      <div className="flex items-center gap-1.5">
                        <PixelIcon name="crown" className="w-3.5 h-3.5 text-primary" />
                        <span className="text-primary font-medium">You own this pixel</span>
                      </div>
                    )}
                  </div>
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
