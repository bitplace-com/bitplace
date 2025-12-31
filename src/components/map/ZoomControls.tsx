import { Plus, Minus, Eye, EyeOff } from 'lucide-react';
import { GlassPanel } from '@/components/ui/glass-panel';
import { GlassIconButton } from '@/components/ui/glass-icon-button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Z_PAINT } from './hooks/useMapState';

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  artOpacity: number;
  onToggleArtOpacity: () => void;
}

export function ZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  artOpacity,
  onToggleArtOpacity,
}: ZoomControlsProps) {
  const canPaint = zoom >= Z_PAINT;
  const isReduced = artOpacity < 1;

  return (
    <div className="flex flex-col gap-2">
      {/* Art Opacity Toggle - Same width as zoom panel */}
      <Tooltip>
        <TooltipTrigger asChild>
          <GlassPanel padding="none" className="overflow-hidden">
            <GlassIconButton
              variant={isReduced ? "active" : "ghost"}
              onClick={onToggleArtOpacity}
              className="rounded-none w-full"
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
      <GlassPanel padding="none" className="overflow-hidden">
        <GlassIconButton
          variant="ghost"
          onClick={onZoomIn}
          className="rounded-none border-b border-border/30"
          aria-label="Zoom in"
        >
          <Plus className="h-4 w-4" />
        </GlassIconButton>
        <GlassIconButton
          variant="ghost"
          onClick={onZoomOut}
          className="rounded-none"
          aria-label="Zoom out"
        >
          <Minus className="h-4 w-4" />
        </GlassIconButton>
      </GlassPanel>

      {/* Zoom Level Indicator */}
      <GlassPanel
        variant={canPaint ? "secondary" : "default"}
        padding="sm"
        className={`text-center transition-all duration-300 ${
          canPaint
            ? 'ring-1 ring-primary/30 shadow-[0_0_12px_rgba(96,69,255,0.2)]'
            : ''
        }`}
      >
        <span
          className={`text-xs font-mono font-medium ${
            canPaint ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          z{zoom.toFixed(1)}
        </span>
      </GlassPanel>
    </div>
  );
}
