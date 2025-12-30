import { Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
      <div className="flex flex-col bg-background/90 backdrop-blur-sm rounded-lg border border-border shadow-lg overflow-hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={onZoomIn}
          className="h-10 w-10 rounded-none border-b border-border"
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onZoomOut}
          className="h-10 w-10 rounded-none"
        >
          <Minus className="h-4 w-4" />
        </Button>
      </div>
      <div
        className={`px-3 py-1.5 rounded-lg text-xs font-mono text-center ${
          canPaint
            ? 'bg-primary/20 text-primary border border-primary/30'
            : 'bg-muted text-muted-foreground border border-border'
        }`}
      >
        z{zoom.toFixed(1)}
      </div>
    </div>
  );
}
