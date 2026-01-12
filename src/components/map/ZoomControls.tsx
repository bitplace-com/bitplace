import { PixelIcon } from '@/components/icons';
import { GlassPanel } from '@/components/ui/glass-panel';
import { GlassIconButton } from '@/components/ui/glass-icon-button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  artOpacity: number;
  onToggleArtOpacity: () => void;
}

export function ZoomControls({
  onZoomIn,
  onZoomOut,
  artOpacity,
  onToggleArtOpacity,
}: ZoomControlsProps) {
  const isReduced = artOpacity < 1;

  return (
    <div className="flex flex-col gap-2 mb-safe">
      {/* Art Opacity Toggle */}
      <Tooltip>
        <TooltipTrigger asChild>
          <GlassIconButton
            variant={isReduced ? "active" : "default"}
            onClick={onToggleArtOpacity}
            aria-label={isReduced ? "Show art" : "Reduce art opacity"}
          >
            <PixelIcon name={isReduced ? "eyeOff" : "eye"} size="sm" />
          </GlassIconButton>
        </TooltipTrigger>
        <TooltipContent side="left">
          {isReduced ? "Show pixel art" : "Reduce pixel art opacity"}
        </TooltipContent>
      </Tooltip>

      {/* Zoom Controls */}
      <GlassIconButton
        variant="default"
        onClick={onZoomIn}
        aria-label="Zoom in"
      >
        <PixelIcon name="plus" size="sm" />
      </GlassIconButton>
      <GlassIconButton
        variant="default"
        onClick={onZoomOut}
        aria-label="Zoom out"
      >
        <PixelIcon name="minus" size="sm" />
      </GlassIconButton>
    </div>
  );
}
