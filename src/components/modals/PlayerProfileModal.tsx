import { useRef, useEffect, useState } from "react";
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
import { usePlayerProfile, PlayerPixel } from "@/hooks/usePlayerProfile";
import { useFollows, useFollowerCount } from "@/hooks/useFollows";
import { useWallet } from "@/contexts/WalletContext";
import { OwnerArtworkModal } from "@/components/map/OwnerArtworkModal";
import { AvatarFallback } from "@/components/ui/avatar-fallback-pattern";
import { getCountryByCode } from "@/lib/countries";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
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

// Mini-map component that shows player's pixels
function PixelMiniMap({ pixels, onClick }: { pixels: PlayerPixel[]; onClick?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || pixels.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
    
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = 'hsl(var(--muted))';
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    if (pixels.length === 0) return;

    const xs = pixels.map(p => p.x);
    const ys = pixels.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const rangeX = maxX - minX + 1;
    const rangeY = maxY - minY + 1;
    
    const padding = 10;
    const availableWidth = displayWidth - padding * 2;
    const availableHeight = displayHeight - padding * 2;
    
    const pixelSize = Math.max(2, Math.min(
      availableWidth / rangeX,
      availableHeight / rangeY,
      8
    ));

    const drawWidth = rangeX * pixelSize;
    const drawHeight = rangeY * pixelSize;
    const offsetX = (displayWidth - drawWidth) / 2;
    const offsetY = (displayHeight - drawHeight) / 2;

    pixels.forEach(pixel => {
      const x = offsetX + (pixel.x - minX) * pixelSize;
      const y = offsetY + (pixel.y - minY) * pixelSize;
      ctx.fillStyle = pixel.color || '#888888';
      ctx.fillRect(x, y, pixelSize - 0.5, pixelSize - 0.5);
    });
  }, [pixels]);

  if (pixels.length === 0) {
    return (
      <div className="w-full h-32 rounded-lg bg-muted flex items-center justify-center">
        <p className="text-sm text-muted-foreground">No pixels owned yet</p>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={cn(
        "w-full h-32 rounded-lg",
        onClick && "cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
      )}
      style={{ imageRendering: 'pixelated' }}
      onClick={onClick}
    />
  );
}

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
                  name={profile.displayName}
                  wallet={profile.walletShort}
                  className="w-16 h-16 ring-2 ring-border"
                  textClassName="text-xl"
                />
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-lg truncate">
                    {profile.displayName || profile.walletShort || 'Unknown'}
                  </h3>
                  {isAdmin(profile.walletAddress || profile.walletShort) && <AdminBadge size="md" />}
                  {(() => { const tier = getProTier(profile.peUsed); return tier ? <ProBadge tier={tier} size="md" /> : null; })()}
                  {country && (
                    <span className="text-lg" title={country.name}>
                      {country.flag}
                    </span>
                  )}
                </div>
                
                {profile.allianceTag && (
                  <span className="text-sm text-primary font-medium">
                    [{profile.allianceTag}]
                  </span>
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
                    <span>Twitter</span>
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

            {/* Mini-map - clickable to open Paints modal */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium flex items-center gap-1.5">
                  <PixelIcon name="brush" className="h-4 w-4" />
                  Paints
                </h4>
                {profile.pixels.length > 0 && (
                  <button
                    onClick={() => setArtworkModalOpen(true)}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors"
                  >
                    <PixelIcon name="expand" className="h-3 w-3" />
                    Expand
                  </button>
                )}
              </div>
              <PixelMiniMap
                pixels={profile.pixels}
                onClick={profile.pixels.length > 0 ? () => setArtworkModalOpen(true) : undefined}
              />
              <span className="text-xs text-muted-foreground">
                {profile.totalPixelsOwned} pixel{profile.totalPixelsOwned !== 1 ? 's' : ''} owned
              </span>
            </div>

            <Separator />

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <StatCard
                label="Pixels Painted"
                value={profile.pixelsPaintedTotal}
                iconName="brush"
                iconPosition="value"
              />
              <StatCard
                label="Pixels Owned"
                value={profile.totalPixelsOwned}
                iconName="pin"
                iconPosition="value"
              />
              <StatCard
                label="PE Staked"
                value={profile.totalStaked}
                iconPosition="value"
                suffix={<PEIcon size="sm" className="text-muted-foreground" />}
              />
              <StatCard
                label="Staked Value"
                value={peToUsd(profile.totalStaked)}
                valueClassName="text-emerald-500"
              />
            </div>

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
