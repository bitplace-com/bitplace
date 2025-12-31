import { Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassPanel } from '@/components/ui/glass-panel';
import { Z_PAINT } from './hooks/useMapState';

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export function ZoomControls({ zoom, onZoomIn, onZoomOut }: ZoomControlsProps) {
  const canPaint = zoom >= Z_PAINT;
  
  return (
    <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
      <GlassPanel padding="none" className="shadow-lg overflow-hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={onZoomIn}
          className="h-10 w-10 rounded-none border-b border-border/30 hover:bg-primary/10 hover:text-primary transition-colors"
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onZoomOut}
          className="h-10 w-10 rounded-none hover:bg-primary/10 hover:text-primary transition-colors"
        >
          <Minus className="h-4 w-4" />
        </Button>
      </GlassPanel>
      <GlassPanel
        variant={canPaint ? "secondary" : "default"}
        padding="sm"
        className={`text-center transition-all duration-300 ${
          canPaint
            ? 'ring-1 ring-primary/30 shadow-[0_0_12px_rgba(96,69,255,0.2)]'
            : ''
        }`}
      >
        <span className={`text-xs font-mono font-medium ${canPaint ? 'text-primary' : 'text-muted-foreground'}`}>
          z{zoom.toFixed(1)}
        </span>
      </GlassPanel>
    </div>
  );
}
