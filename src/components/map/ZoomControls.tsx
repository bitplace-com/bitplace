import { Plus, Minus } from 'lucide-react';
import { GlassPanel } from '@/components/ui/glass-panel';
import { GlassIconButton } from '@/components/ui/glass-icon-button';
import { ArtOpacityButton } from './ArtOpacityButton';
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

  return (
    <div className="flex flex-col gap-2">
      {/* Art Opacity Toggle */}
      <ArtOpacityButton opacity={artOpacity} onToggle={onToggleArtOpacity} />

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
