import { useRef, useEffect, useState } from "react";
import { PixelIcon } from "@/components/icons";
import { ProBadge } from "@/components/ui/pro-badge";
import { AdminBadge } from "@/components/ui/admin-badge";
import { getProTier, isAdmin } from "@/lib/userBadges";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { PEIcon } from "@/components/ui/pe-icon";
import { usePlayerProfile, PlayerPixel } from "@/hooks/usePlayerProfile";
import { useFollows, useFollowerCount } from "@/hooks/useFollows";
import { useWallet } from "@/contexts/WalletContext";
import { generateAvatarGradient } from "@/lib/avatar";
import { getCountryByCode } from "@/lib/countries";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface PlayerProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playerId: string | null;
}

// Mini-map component that shows player's pixels
function PixelMiniMap({ pixels }: { pixels: PlayerPixel[] }) {
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

    // Clear canvas
    ctx.fillStyle = 'hsl(var(--muted))';
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    if (pixels.length === 0) return;

    // Calculate bounds
    const xs = pixels.map(p => p.x);
    const ys = pixels.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const rangeX = maxX - minX + 1;
    const rangeY = maxY - minY + 1;
    
    // Add padding
    const padding = 10;
    const availableWidth = displayWidth - padding * 2;
    const availableHeight = displayHeight - padding * 2;
    
    // Calculate pixel size to fit all pixels
    const pixelSize = Math.max(2, Math.min(
      availableWidth / rangeX,
      availableHeight / rangeY,
      8 // Max pixel size
    ));

    // Center the drawing
    const drawWidth = rangeX * pixelSize;
    const drawHeight = rangeY * pixelSize;
    const offsetX = (displayWidth - drawWidth) / 2;
    const offsetY = (displayHeight - drawHeight) / 2;

    // Draw pixels
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
      className="w-full h-32 rounded-lg"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}

function StatCard({ 
  label, 
  value, 
  iconName,
  suffix,
}: { 
  label: string; 
  value: string | number;
  iconName?: string;
  suffix?: React.ReactNode;
}) {
  return (
    <div className="bg-accent rounded-lg p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        {iconName && <PixelIcon name={iconName as any} className="h-3 w-3" />}
        {label}
      </div>
      <div className="text-lg font-semibold flex items-center gap-1">
        {typeof value === 'number' ? value.toLocaleString() : value}
        {suffix}
      </div>
    </div>
  );
}

export function PlayerProfileModal({ open, onOpenChange, playerId }: PlayerProfileModalProps) {
  const { profile, isLoading, error } = usePlayerProfile(open ? playerId : null);
  const { user } = useWallet();
  const userId = user?.id;
  const { isFollowing, follow, unfollow } = useFollows();
  const { count: followerCount } = useFollowerCount(open ? playerId : null);
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const isOwnProfile = userId && playerId === userId;
  const following = playerId ? isFollowing(playerId) : false;

  const handleFollowToggle = async () => {
    if (!playerId || isOwnProfile) return;
    
    setIsProcessing(true);
    try {
      if (following) {
        const success = await unfollow(playerId);
        if (success) {
          toast({ title: "Unfollowed player" });
        }
      } else {
        const success = await follow(playerId);
        if (success) {
          toast({ title: "Following player", description: "You'll get notified when they paint" });
        }
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to update follow status", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const avatarGradient = generateAvatarGradient(profile?.id || playerId || '');
  const country = profile?.countryCode ? getCountryByCode(profile.countryCode) : null;
  const hasSocials = profile?.socialX || profile?.socialInstagram || profile?.socialDiscord || profile?.socialWebsite;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto px-4 sm:px-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Player Profile</DialogTitle>
        </DialogHeader>

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
          <div className="space-y-5 py-4 sm:space-y-6">
            {/* Header */}
            <div className="flex items-start gap-4">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt=""
                  className="w-16 h-16 rounded-full object-cover ring-2 ring-border"
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-full ring-2 ring-border flex items-center justify-center text-white text-xl font-bold"
                  style={{ background: avatarGradient }}
                >
                  {(profile.displayName?.[0] || profile.walletShort?.[0] || '?').toUpperCase()}
                </div>
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

            {/* Social Links */}
            {hasSocials && (
              <div className="flex items-center gap-3">
                {profile.socialX && (
                  <a
                    href={profile.socialX}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <PixelIcon name="twitter" className="h-4 w-4" />
                    <span className="hidden sm:inline">Twitter</span>
                    <PixelIcon name="externalLink" className="h-3 w-3" />
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
                    <span className="hidden sm:inline">Instagram</span>
                    <PixelIcon name="externalLink" className="h-3 w-3" />
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
                    <span className="hidden sm:inline">Website</span>
                    <PixelIcon name="externalLink" className="h-3 w-3" />
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
                    <span className="hidden sm:inline">Discord</span>
                    <PixelIcon name="externalLink" className="h-3 w-3" />
                  </a>
                )}
              </div>
            )}

            <Separator />

            {/* Mini-map */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium flex items-center gap-1.5">
                  <PixelIcon name="pin" className="h-4 w-4" />
                  Owned Pixels
                </h4>
                <span className="text-xs text-muted-foreground">
                  {profile.totalPixelsOwned} pixel{profile.totalPixelsOwned !== 1 ? 's' : ''}
                </span>
              </div>
              <PixelMiniMap pixels={profile.pixels} />
            </div>

            <Separator />

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <StatCard
                label="Pixels Owned"
                value={profile.totalPixelsOwned}
                iconName="pin"
              />
              <StatCard
                label="Total Staked"
                value={profile.totalStaked}
                suffix={<PEIcon size="sm" className="text-muted-foreground" />}
              />
              <StatCard
                label="Pixels Painted"
                value={profile.totalPixelsOwned}
                iconName="brush"
              />
              <StatCard
                label="PE Used"
                value={profile.peUsed}
                suffix={<PEIcon size="sm" className="text-muted-foreground" />}
              />
            </div>

            {/* Joined date */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground justify-center pt-2">
              <PixelIcon name="calendar" className="h-3 w-3" />
              Joined {format(new Date(profile.joinedAt), 'MMMM d, yyyy')}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
