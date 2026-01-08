import { Copy, X, Share2, Palette, Shield, Swords, RefreshCw, AlertTriangle, Eraser } from 'lucide-react';
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
  onErase: (x: number, y: number) => void;
  selectedColor: string | null;
  mode: GameMode;
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

export function PixelInspectorCard({
  x,
  y,
  onClose,
  onPaint,
  onDefendAttack,
  onErase,
  selectedColor,
  mode,
  currentUserId,
}: PixelInspectorCardProps) {
  const { pixel, isLoading, refetch } = usePixelDetails(x, y);

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

  const handleErase = () => {
    onErase(x, y);
    onClose();
  };

  const isOwned = pixel !== null && pixel.owner !== null;
  const isOwnPixel = pixel?.owner?.id === currentUserId;
  const country = pixel?.owner?.country_code ? getCountryByCode(pixel.owner.country_code) : null;

  return (
    <GlassPanel className="w-80 max-w-[calc(100vw-2rem)]" padding="none">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
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
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-accent transition-colors"
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
          <div className="flex flex-col items-center py-4 gap-2">
            <div
              className="w-10 h-10 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center"
              style={{ backgroundColor: selectedColor ?? undefined }}
            >
              <Palette className="w-5 h-5 text-white/80" />
            </div>
            <span className="text-sm font-medium text-foreground">Unclaimed Pixel</span>
            <span className="text-xs text-muted-foreground">Cost: 1 PE (~$0.001)</span>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Owner Info */}
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold text-sm shrink-0"
                style={{
                  background: pixel.color || generateAvatarGradient(pixel.owner?.id || 'unknown'),
                }}
              >
                {getAvatarInitial(pixel.owner?.display_name, pixel.owner?.wallet_short)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-medium text-sm text-foreground truncate">
                    {pixel.owner?.display_name || pixel.owner?.wallet_short || 'Unknown'}
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
                  {pixel.ownerRebalanceActive && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      {Math.round(pixel.ownerHealthMultiplier * 100)}% HP
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
              <div className="bg-accent rounded-lg px-3 py-2">
                <div className="text-xs text-muted-foreground">Value</div>
                <div className="text-sm font-semibold text-foreground">
                  {pixel.vNow.toLocaleString()} PE
                </div>
              </div>
              <div className="bg-accent rounded-lg px-3 py-2">
                <div className="text-xs text-muted-foreground">
                  {isOwnPixel ? 'Repaint' : 'Takeover'}
                </div>
                <div className="text-sm font-semibold text-foreground">
                  {isOwnPixel ? '0 PE' : `${pixel.thresholdWithFloor.toLocaleString()} PE`}
                </div>
                {pixel.isFloorBased && !isOwnPixel && (
                  <div className="text-[10px] text-amber-600 dark:text-amber-500 flex items-center gap-0.5">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    Floor-based
                  </div>
                )}
                {!pixel.isFloorBased && !isOwnPixel && (
                  <div className="text-[10px] text-muted-foreground">
                    ~${(pixel.thresholdWithFloor * 0.001).toFixed(3)}
                  </div>
                )}
              </div>
            </div>

            {/* Health Status (if owner is in rebalance) */}
            {pixel.ownerRebalanceActive && (
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
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-t border-border">
        {mode === 'PAINT' && !isOwnPixel && (
          <Button size="sm" className="flex-1" onClick={handlePaint}>
            <Palette className="w-4 h-4 mr-1.5" />
            Paint
          </Button>
        )}
        {mode === 'PAINT' && isOwnPixel && (
          <>
            <Button size="sm" variant="outline" className="flex-1" onClick={handlePaint}>
              <Palette className="w-4 h-4 mr-1.5" />
              Repaint
            </Button>
            <Button size="sm" variant="destructive" onClick={handleErase}>
              <Eraser className="w-4 h-4 mr-1.5" />
              Erase
            </Button>
          </>
        )}
        {mode === 'ERASE' && isOwnPixel && (
          <Button size="sm" variant="destructive" className="flex-1" onClick={handleErase}>
            <Eraser className="w-4 h-4 mr-1.5" />
            Erase
          </Button>
        )}
        {mode === 'ERASE' && !isOwnPixel && (
          <div className="flex-1 text-xs text-muted-foreground text-center py-1">
            You can only erase your own pixels
          </div>
        )}
        {(mode === 'DEFEND' || mode === 'ATTACK') && (
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
