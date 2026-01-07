import { Plus, Minus, Eye, EyeOff } from 'lucide-react';
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
    <div className="flex flex-col gap-2">
      {/* Art Opacity Toggle */}
      <Tooltip>
        <TooltipTrigger asChild>
          <GlassPanel padding="none" className="overflow-hidden">
            <GlassIconButton
              variant={isReduced ? "active" : "default"}
              onClick={onToggleArtOpacity}
              className="rounded-none w-full border-0"
              aria-label={isReduced ? "Show art" : "Reduce art opacity"}
            >
              {isReduced ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </GlassIconButton>
          </GlassPanel>
        </TooltipTrigger>
        <TooltipContent side="left">
          {isReduced ? "Show pixel art" : "Reduce pixel art opacity"}
        </TooltipContent>
      </Tooltip>

      {/* Zoom Controls */}
      <GlassPanel padding="none" className="overflow-hidden flex flex-col">
        <GlassIconButton
          variant="default"
          onClick={onZoomIn}
          className="rounded-none border-0"
          aria-label="Zoom in"
        >
          <Plus className="h-4 w-4" />
        </GlassIconButton>
        <GlassIconButton
          variant="default"
          onClick={onZoomOut}
          className="rounded-none border-0"
          aria-label="Zoom out"
        >
          <Minus className="h-4 w-4" />
        </GlassIconButton>
      </GlassPanel>
    </div>
  );
}
