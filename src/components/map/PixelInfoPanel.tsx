import { useState } from 'react';
import { Copy, X, Share2, RefreshCw, AlertTriangle, Globe, Twitter, Instagram, MapPin, Users, Shield, Swords, Coins } from 'lucide-react';
import { PEIcon } from '@/components/ui/pe-icon';
import { toast } from 'sonner';

import { GlassPanel } from '@/components/ui/glass-panel';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { UserMinimap } from '@/components/UserMinimap';
import { usePixelDetails } from '@/hooks/usePixelDetails';
import { generateAvatarGradient, getAvatarInitial } from '@/lib/avatar';
import { getCountryByCode } from '@/lib/countries';
import { copyPixelCoords, copyPixelLink } from '@/lib/shareLink';
import { cn } from '@/lib/utils';

interface PixelInfoPanelProps {
  x: number;
  y: number;
  onClose: () => void;
  currentUserId?: string;
  actionSelectionCount?: number; // Read-only display of selection count
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

export function PixelInfoPanel({
  x,
  y,
  onClose,
  currentUserId,
  actionSelectionCount = 0,
}: PixelInfoPanelProps) {
  const { pixel, isLoading, refetch } = usePixelDetails(x, y, currentUserId);

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

  const isOwned = pixel !== null && pixel.owner !== null;
  const isOwnPixel = pixel?.owner?.id === currentUserId;
  const country = pixel?.owner?.country_code ? getCountryByCode(pixel.owner.country_code) : null;

  return (
    <GlassPanel className="w-80 max-w-[calc(100vw-2rem)] max-h-[70vh] overflow-hidden flex flex-col" padding="none">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            Pixel: {x.toLocaleString()}, {y.toLocaleString()}
          </span>
          <button
            onClick={handleCopyCoords}
            className="p-1 rounded hover:bg-accent transition-colors"
            title="Copy coordinates"
          >
            <Copy className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          {/* Selection count chip (read-only) */}
          {actionSelectionCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
              +{actionSelectionCount} selected
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleShare}
            className="p-1 rounded hover:bg-accent transition-colors"
            title="Share link"
          >
            <Share2 className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-accent transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : !pixel ? (
          <div className="flex flex-col items-center py-4 gap-3">
            <div className="text-sm text-muted-foreground text-center">
              Couldn't load pixel data
            </div>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Retry
            </Button>
          </div>
        ) : !isOwned ? (
          /* Unclaimed Pixel */
          <div className="flex flex-col items-center py-4 gap-3">
            <div className="w-12 h-12 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted/50">
              <MapPin className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="text-center">
              <span className="text-sm font-medium text-foreground block">Unclaimed Pixel</span>
              <span className="text-xs text-muted-foreground mt-1 block">
                Coordinates: ({x.toLocaleString()}, {y.toLocaleString()})
              </span>
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              Claim cost: 1 <PEIcon size="xs" />
            </div>
          </div>
        ) : (
          /* Owned Pixel - Full Info */
          <div className="space-y-4">
            {/* Color + Value Row */}
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg border border-border shrink-0"
                style={{ backgroundColor: pixel.color || '#888888' }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground">Color</div>
                <div className="text-sm font-mono text-foreground">
                  {pixel.color?.toUpperCase() || 'Unknown'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Value</div>
                <div className="text-sm font-semibold text-foreground flex items-center justify-end gap-1">
                  {pixel.vNow.toLocaleString()}
                  <PEIcon size="xs" className="text-muted-foreground" />
                </div>
              </div>
            </div>

            {/* Value Breakdown (read-only) */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <div className="text-xs font-medium text-foreground mb-2">Value Breakdown</div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-[10px] text-muted-foreground">Owner Stake</div>
                  <div className="text-sm font-semibold">{pixel.owner_stake_pe.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-[10px] text-emerald-400 flex items-center justify-center gap-0.5">
                    <Shield className="w-2.5 h-2.5" /> DEF
                  </div>
                  <div className="text-sm font-semibold text-emerald-400">+{pixel.defTotal.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-[10px] text-rose-400 flex items-center justify-center gap-0.5">
                    <Swords className="w-2.5 h-2.5" /> ATK
                  </div>
                  <div className="text-sm font-semibold text-rose-400">-{pixel.atkTotal.toLocaleString()}</div>
                </div>
              </div>
              <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">V = Stake + DEF - ATK</span>
                <span className={cn(
                  "text-sm font-bold",
                  pixel.vNow < 0 ? "text-destructive" : "text-foreground"
                )}>
                  {pixel.vNow.toLocaleString()} PE
                </span>
              </div>
              {/* Takeover threshold */}
              {!isOwnPixel && (
                <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Takeover threshold</span>
                  <span className="text-sm font-semibold text-foreground">
                    {pixel.thresholdWithFloor.toLocaleString()} PE
                  </span>
                </div>
              )}
            </div>

            <Separator />

            {/* Owner Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                <span>Owner</span>
              </div>
              
              <div className="flex items-start gap-3">
                {/* Avatar */}
                {pixel.owner?.avatar_url ? (
                  <img
                    src={pixel.owner.avatar_url}
                    alt="Owner avatar"
                    className="w-10 h-10 rounded-lg object-cover shrink-0"
                  />
                ) : (
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold text-sm shrink-0"
                    style={{
                      background: generateAvatarGradient(pixel.owner?.id || 'unknown'),
                    }}
                  >
                    {getAvatarInitial(pixel.owner?.display_name, pixel.owner?.wallet_short)}
                  </div>
                )}
                
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={cn(
                      "font-medium text-sm truncate",
                      isOwnPixel ? "text-primary" : "text-foreground"
                    )}>
                      {pixel.owner?.display_name || pixel.owner?.wallet_short || 'Unknown'}
                      {isOwnPixel && ' (You)'}
                    </span>
                    {pixel.owner?.alliance_tag && (
                      <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-primary/10 text-foreground">
                        [{pixel.owner.alliance_tag}]
                      </span>
                    )}
                    {country && (
                      <span className="text-sm" title={country.name}>
                        {country.flag}
                      </span>
                    )}
                  </div>
                  
                  {/* Wallet */}
                  {pixel.owner?.wallet_short && (
                    <div className="text-xs text-muted-foreground font-mono mt-0.5">
                      {pixel.owner.wallet_short}
                    </div>
                  )}
                  
                  {/* Bio */}
                  {pixel.owner?.bio && (
                    <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                      {pixel.owner.bio}
                    </p>
                  )}
                  
                  {/* Social Links */}
                  {(pixel.owner?.social_x || pixel.owner?.social_instagram || pixel.owner?.social_website) && (
                    <div className="flex items-center gap-2 mt-2">
                      {pixel.owner.social_x && (
                        <a
                          href={pixel.owner.social_x}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          title="X / Twitter"
                        >
                          <Twitter className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {pixel.owner.social_instagram && (
                        <a
                          href={pixel.owner.social_instagram}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          title="Instagram"
                        >
                          <Instagram className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {pixel.owner.social_website && (
                        <a
                          href={pixel.owner.social_website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          title="Website"
                        >
                          <Globe className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Owner Minimap */}
            {pixel.owner?.id && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>Owner's Pixels</span>
                    </div>
                  </div>
                  <UserMinimap 
                    userId={pixel.owner.id} 
                    height="6rem"
                    showEmptyState={false}
                  />
                </div>
              </>
            )}

            {/* Health Status (if owner is in rebalance) */}
            {pixel.ownerRebalanceActive && (
              <>
                <Separator />
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="h-3 w-3" />
                      <span>Owner Rebalancing</span>
                    </div>
                    <div className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                      {Math.round(pixel.ownerHealthMultiplier * 100)}%
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-500 transition-all duration-300"
                      style={{ width: `${pixel.ownerHealthMultiplier * 100}%` }}
                    />
                  </div>
                  
                  {/* Next tick info */}
                  {pixel.nextTickTime && (
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-muted-foreground">
                        Next tick: {formatTimeUntil(pixel.nextTickTime)}
                      </span>
                      {pixel.vFloorNext6h !== null && (
                        <span className="text-muted-foreground">
                          V → {Math.floor(pixel.vFloorNext6h).toLocaleString()} PE
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* My Involvement (read-only) */}
            {pixel.myContribution && (
              <>
                <Separator />
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                  <div className="text-xs font-medium text-foreground mb-2">Your Involvement</div>
                  <div className="flex items-center gap-2">
                    {pixel.myContribution.side === 'DEF' ? (
                      <Shield className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Swords className="h-4 w-4 text-rose-400" />
                    )}
                    <span className="text-sm">
                      Your {pixel.myContribution.side}: 
                      <span className="font-semibold ml-1">
                        {pixel.myContribution.amount_pe.toLocaleString()} PE
                      </span>
                    </span>
                  </div>
                  {isOwnPixel && (
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
                      <Coins className="h-4 w-4 text-primary" />
                      <span className="text-sm text-primary font-medium">You own this pixel</span>
                    </div>
                  )}
                </div>
              </>
            )}
            
            {/* Owner but no contribution shown */}
            {isOwnPixel && !pixel.myContribution && (
              <>
                <Separator />
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Coins className="h-4 w-4 text-primary" />
                    <span className="text-sm text-primary font-medium">You own this pixel</span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </GlassPanel>
  );
}
