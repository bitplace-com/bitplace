import { Copy, X, Share2, Palette, Shield, Swords } from 'lucide-react';
import { toast } from 'sonner';

import { GlassPanel } from '@/components/ui/glass-panel';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePixelDetails } from '@/hooks/usePixelDetails';
import { generateAvatarGradient, getAvatarInitial } from '@/lib/avatar';
import { getCountryByCode } from '@/lib/countries';
import { copyPixelCoords, copyPixelLink } from '@/lib/shareLink';
import type { GameMode } from '@/hooks/useGameActions';

interface PixelInspectorCardProps {
  x: number;
  y: number;
  onClose: () => void;
  onPaint: (x: number, y: number) => void;
  onDefendAttack: (x: number, y: number, mode: 'DEFEND' | 'ATTACK') => void;
  selectedColor: string | null;
  mode: GameMode;
  currentUserId?: string;
}

export function PixelInspectorCard({
  x,
  y,
  onClose,
  onPaint,
  onDefendAttack,
  selectedColor,
  mode,
  currentUserId,
}: PixelInspectorCardProps) {
  const { pixel, isLoading } = usePixelDetails(x, y);

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

  const handlePaint = () => {
    onPaint(x, y);
    onClose();
  };

  const handleDefendAttack = () => {
    const targetMode = mode === 'DEFEND' ? 'DEFEND' : 'ATTACK';
    onDefendAttack(x, y, targetMode);
    onClose();
  };

  const isOwned = pixel?.owner !== null;
  const isOwnPixel = pixel?.owner?.id === currentUserId;
  const country = pixel?.owner?.country_code ? getCountryByCode(pixel.owner.country_code) : null;

  return (
    <GlassPanel className="w-80 max-w-[calc(100vw-2rem)]" padding="none">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/50">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            Pixel: {x.toLocaleString()}, {y.toLocaleString()}
          </span>
          <button
            onClick={handleCopyCoords}
            className="p-1 rounded hover:bg-muted/50 transition-colors"
            title="Copy coordinates"
          >
            <Copy className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-muted/50 transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Content */}
      <div className="px-3 py-3">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-8 w-2/3" />
          </div>
        ) : !isOwned ? (
          /* Empty Pixel */
          <div className="flex flex-col items-center py-4 gap-2">
            <div
              className="w-10 h-10 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center"
              style={{ backgroundColor: selectedColor }}
            >
              <Palette className="w-5 h-5 text-white/80" />
            </div>
            <span className="text-sm font-medium text-foreground">Unclaimed Pixel</span>
            <span className="text-xs text-muted-foreground">Cost: 1 PE</span>
          </div>
        ) : (
          /* Owned Pixel */
          <div className="space-y-3">
            {/* Owner Info */}
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold text-sm shrink-0"
                style={{
                  background: pixel.color || generateAvatarGradient(pixel.owner?.id || 'unknown'),
                }}
              >
                {getAvatarInitial(pixel.owner?.display_name, pixel.owner?.wallet_address)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-medium text-sm text-foreground truncate">
                    {pixel.owner?.display_name || truncateWallet(pixel.owner?.wallet_address)}
                  </span>
                  {pixel.owner?.alliance_tag && (
                    <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                      [{pixel.owner.alliance_tag}]
                    </span>
                  )}
                  {country && (
                    <span className="text-sm" title={country.name}>
                      {country.flag}
                    </span>
                  )}
                </div>
                {isOwnPixel && (
                  <span className="text-xs text-muted-foreground">Your pixel</span>
                )}
              </div>
            </div>

            {/* Value Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-muted/30 rounded-lg px-3 py-2">
                <div className="text-xs text-muted-foreground">Value</div>
                <div className="text-sm font-semibold text-foreground">
                  {pixel.vNow.toLocaleString()} PE
                </div>
              </div>
              <div className="bg-muted/30 rounded-lg px-3 py-2">
                <div className="text-xs text-muted-foreground">Takeover</div>
                <div className="text-sm font-semibold text-foreground">
                  {pixel.threshold.toLocaleString()} PE
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-t border-border/50">
        {mode === 'PAINT' ? (
          <Button
            size="sm"
            className="flex-1"
            onClick={handlePaint}
          >
            <Palette className="w-4 h-4 mr-1.5" />
            Paint
          </Button>
        ) : (
          <>
            <Button
              size="sm"
              variant={mode === 'DEFEND' ? 'default' : 'outline'}
              className="flex-1"
              onClick={handleDefendAttack}
            >
              {mode === 'DEFEND' ? (
                <>
                  <Shield className="w-4 h-4 mr-1.5" />
                  Defend
                </>
              ) : (
                <>
                  <Swords className="w-4 h-4 mr-1.5" />
                  Attack
                </>
              )}
            </Button>
          </>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={handleShare}
          title="Share link"
        >
          <Share2 className="w-4 h-4" />
        </Button>
      </div>
    </GlassPanel>
  );
}

function truncateWallet(address?: string | null): string {
  if (!address) return 'Unknown';
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
