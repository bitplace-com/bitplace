import { useRef, useEffect, useState, useMemo } from "react";
import { PixelIcon } from "@/components/icons";
import { ProBadge } from "@/components/ui/pro-badge";
import { AdminBadge } from "@/components/ui/admin-badge";
import { getProTier, isAdmin } from "@/lib/userBadges";
import { format } from "date-fns";
import { GamePanel } from "./GamePanel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { PEIcon } from "@/components/ui/pe-icon";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { usePlayerProfile, PlayerPixel } from "@/hooks/usePlayerProfile";
import { useFollows, useFollowerCount } from "@/hooks/useFollows";
import { useWallet } from "@/contexts/WalletContext";
import { OwnerArtworkModal, clusterPixels, ClusterCanvas } from "@/components/map/OwnerArtworkModal";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AvatarFallback } from "@/components/ui/avatar-fallback-pattern";
import { getCountryByCode } from "@/lib/countries";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { shareArtwork } from "@/lib/shareLink";
import { gridIntToLngLat } from "@/lib/pixelGrid";

interface PlayerProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playerId: string | null;
  onJumpToPixel?: (x: number, y: number) => void;
}

function peToUsd(pe: number): string {
  const usd = pe * 0.001;
  return usd < 0.01 ? `$${usd.toFixed(3)}` : `$${usd.toFixed(2)}`;
}

// PixelMiniMap removed — replaced by inline cluster rendering using ClusterCanvas

function StatCard({ 
  label, 
  value, 
  iconName,
  suffix,
  valueClassName,
  iconPosition = 'header',
}: { 
  label: string; 
  value: string | number;
  iconName?: string;
  suffix?: React.ReactNode;
  valueClassName?: string;
  iconPosition?: 'header' | 'value';
}) {
  return (
    <div className="bg-muted/70 rounded-lg p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        {iconName && iconPosition === 'header' && <PixelIcon name={iconName as any} className="h-3 w-3" />}
        {label}
      </div>
      <div className={cn("text-lg font-semibold flex items-center gap-1", valueClassName)}>
        {typeof value === 'number' ? value.toLocaleString() : value}
        {iconName && iconPosition === 'value' && <PixelIcon name={iconName as any} className="h-4 w-4 text-muted-foreground" />}
        {suffix}
      </div>
    </div>
  );
}

export function PlayerProfileModal({ open, onOpenChange, playerId, onJumpToPixel }: PlayerProfileModalProps) {
  const { profile, isLoading, error } = usePlayerProfile(open ? playerId : null);
  const { user } = useWallet();
  const userId = user?.id;
  const { isFollowing, follow, unfollow } = useFollows();
  const { count: followerCount } = useFollowerCount(open ? playerId : null);
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [artworkModalOpen, setArtworkModalOpen] = useState(false);

  const isOwnProfile = userId && playerId === userId;
  const clusters = useMemo(() => profile ? clusterPixels(profile.pixels, 5) : [], [profile]);
  const following = playerId ? isFollowing(playerId) : false;

  const handleFollowToggle = async () => {
    if (!playerId || isOwnProfile) return;
    
    setIsProcessing(true);
    try {
      if (following) {
        const success = await unfollow(playerId);
        if (success) toast({ title: "Unfollowed player" });
      } else {
        const success = await follow(playerId);
        if (success) toast({ title: "Following player", description: "You'll get notified when they paint" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to update follow status", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleJumpToPixel = (x: number, y: number) => {
    const { lng, lat } = gridIntToLngLat(x, y);
    window.dispatchEvent(new CustomEvent('bitplace:navigate', {
      detail: { lat, lng, zoom: 18, pixelX: x, pixelY: y }
    }));
    onOpenChange(false);
  };

  
  const country = profile?.countryCode ? getCountryByCode(profile.countryCode) : null;
  const hasSocials = profile?.socialX || profile?.socialInstagram || profile?.socialDiscord || profile?.socialWebsite;

  return (
    <>
      <GamePanel open={open} onOpenChange={onOpenChange} title="Player Profile" icon={<PixelIcon name="user" size="md" />}>
        {isLoading ? (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4">
              <Skeleton className="w-16 h-16 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <Skeleton className="h-32 w-full" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          </div>
        ) : error || !profile ? (
          <div className="py-8 text-center">
            <PixelIcon name="user" className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">{error || 'Player not found'}</p>
          </div>
        ) : (
          <div className="space-y-5 py-2 sm:space-y-6">
            {/* Header */}
            <div className="flex items-start gap-4">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt=""
                  className="w-16 h-16 rounded-full object-cover ring-2 ring-border"
                />
              ) : (
                <AvatarFallback
                  seed={profile?.id || playerId || ''}
                  className="w-16 h-16 ring-2 ring-border"
                />
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-lg truncate">
                    {profile.displayName || profile.walletShort || 'Unknown'}
                  </h3>
                  {profile.allianceTag && (
                    <span className="text-sm text-primary font-medium">
                      [{profile.allianceTag}]
                    </span>
                  )}
                </div>
                {(isAdmin(profile.walletAddress || profile.walletShort) || getProTier(profile.peUsed) || country) && (
                  <div className="flex items-center gap-2 mt-1">
                    {isAdmin(profile.walletAddress || profile.walletShort) && <AdminBadge size="md" />}
                    {(() => { const tier = getProTier(profile.peUsed); return tier ? <ProBadge tier={tier} size="md" /> : null; })()}
                    {country && (
                      <span className="text-lg" title={country.name}>
                        {country.flag}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Follow button */}
              {!isOwnProfile && userId && (
                <Button
                  variant={following ? "outline" : "default"}
                  size="sm"
                  onClick={handleFollowToggle}
                  disabled={isProcessing}
                  className="shrink-0"
                >
                  {following ? (
                    <>
                      <PixelIcon name="userMinus" className="h-4 w-4 mr-1.5" />
                      Unfollow
                    </>
                  ) : (
                    <>
                      <PixelIcon name="userPlus" className="h-4 w-4 mr-1.5" />
                      Follow
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Followers count */}
            {followerCount > 0 && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <PixelIcon name="users" className="h-4 w-4" />
                {followerCount} follower{followerCount !== 1 ? 's' : ''}
              </div>
            )}

            {/* Bio */}
            {profile.bio && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {profile.bio}
              </p>
            )}

            {/* Social Links - no external link icons */}
            {hasSocials && (
              <div className="flex items-center gap-3 flex-wrap">
                {profile.socialX && (
                  <a
                    href={profile.socialX}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <PixelIcon name="twitter" className="h-4 w-4" />
                    <span>X</span>
                  </a>
                )}
                {profile.socialInstagram && (
                  <a
                    href={profile.socialInstagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <PixelIcon name="instagram" className="h-4 w-4" />
                    <span>Instagram</span>
                  </a>
                )}
                {profile.socialWebsite && (
                  <a
                    href={profile.socialWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <PixelIcon name="globe" className="h-4 w-4" />
                    <span>Website</span>
                  </a>
                )}
                {profile.socialDiscord && (
                  <a
                    href={profile.socialDiscord.startsWith('http') ? profile.socialDiscord : `https://discord.gg/${profile.socialDiscord}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <PixelIcon name="discord" className="h-4 w-4" />
                    <span>Discord</span>
                  </a>
                )}
              </div>
            )}

            <Separator />

            {/* Paints - inline clusters */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium flex items-center gap-1.5">
                  <PixelIcon name="brush" className="h-4 w-4" />
                  Paints
                </h4>
                {profile.pixels.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => shareArtwork(profile.id, profile.displayName).then(ok => ok && toast({ title: 'Link copied!' }))}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors"
                    >
                      <PixelIcon name="share" className="h-3 w-3" />
                      Share
                    </button>
                    <button
                      onClick={() => setArtworkModalOpen(true)}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors"
                    >
                      <PixelIcon name="expand" className="h-3 w-3" />
                      Expand
                    </button>
                  </div>
                )}
              </div>

              {clusters.length === 0 ? (
                <div className="w-full h-32 rounded-lg bg-muted flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">No pixels owned yet</p>
                </div>
              ) : clusters.length === 1 ? (
                <div className="flex flex-col items-center gap-1 p-1">
                  <ClusterCanvas
                    cluster={clusters[0]}
                    onClick={() => {
                      const { lng, lat } = gridIntToLngLat(clusters[0].centerX, clusters[0].centerY);
                      window.dispatchEvent(new CustomEvent('bitplace:navigate', {
                        detail: { lat, lng, zoom: 18, pixelX: clusters[0].centerX, pixelY: clusters[0].centerY }
                      }));
                      onOpenChange(false);
                    }}
                    size={240}
                  />
                </div>
              ) : (
                <ScrollArea className="max-h-52">
                  <div className="grid grid-cols-2 gap-2 p-1 pr-3">
                    {clusters.map((cluster, i) => (
                      <div key={i} className="flex flex-col items-center gap-1">
                        <ClusterCanvas
                          cluster={cluster}
                          onClick={() => {
                            const { lng, lat } = gridIntToLngLat(cluster.centerX, cluster.centerY);
                            window.dispatchEvent(new CustomEvent('bitplace:navigate', {
                              detail: { lat, lng, zoom: 18, pixelX: cluster.centerX, pixelY: cluster.centerY }
                            }));
                            onOpenChange(false);
                          }}
                          size={140}
                        />
                        <span className="text-[10px] text-muted-foreground">
                          {cluster.pixels.length.toLocaleString()} px
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}

              <span className="text-xs text-muted-foreground">
                {profile.totalPixelsOwned} pixel{profile.totalPixelsOwned !== 1 ? 's' : ''} owned
              </span>
            </div>

            <Separator />

            {/* Stats Grid */}
            <TooltipProvider delayDuration={200}>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <StatCard
                        label="Pixels Painted"
                        value={profile.pixelsPaintedTotal}
                        iconName="brush"
                        iconPosition="value"
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-56 text-xs">
                    Total number of pixels this player has painted across all time.
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <StatCard
                        label="Pixels Owned"
                        value={profile.totalPixelsOwned}
                        iconName="pin"
                        iconPosition="value"
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-56 text-xs">
                    Pixels currently owned by this player on the map.
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <StatCard
                        label="PE Used"
                        value={profile.totalStaked}
                        iconPosition="value"
                        suffix={<PEIcon size="sm" className="text-muted-foreground" />}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-56 text-xs">
                    Paint Energy currently locked in pixel stakes.
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <StatCard
                        label="PE Value"
                        value={peToUsd(profile.totalStaked)}
                        valueClassName="text-emerald-500"
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-56 text-xs">
                    Dollar value of used PE at $0.001 per PE.
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>

            {/* Joined date */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground justify-center pt-2">
              <PixelIcon name="calendar" className="h-3 w-3" />
              Joined {format(new Date(profile.joinedAt), 'MMMM d, yyyy')}
            </div>
          </div>
        )}
      </GamePanel>

      {/* Paints Modal */}
      {profile?.id && (
        <OwnerArtworkModal
          open={artworkModalOpen}
          onOpenChange={setArtworkModalOpen}
          userId={profile.id}
          ownerName={profile.displayName}
          onJumpToPixel={handleJumpToPixel}
        />
      )}
    </>
  );
}
