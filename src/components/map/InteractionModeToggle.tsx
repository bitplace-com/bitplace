import { Hand, Paintbrush } from 'lucide-react';
import { cn } from '@/lib/utils';

export type InteractionMode = 'drag' | 'draw';

interface InteractionModeToggleProps {
  mode: InteractionMode;
  onModeChange: (mode: InteractionMode) => void;
  disabled?: boolean;
}

export function InteractionModeToggle({
  mode,
  onModeChange,
  disabled = false,
}: InteractionModeToggleProps) {
  return (
    <div className={cn(
      "flex items-center gap-0.5 bg-secondary/90 backdrop-blur-md rounded-lg p-0.5 border border-border shadow-lg",
      disabled && "opacity-50 pointer-events-none"
    )}>
      <button
        onClick={() => onModeChange('drag')}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-all",
          mode === 'drag'
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
        )}
        title="Drag mode: Pan map, click to inspect"
      >
        <Hand className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Drag</span>
      </button>
      <button
        onClick={() => onModeChange('draw')}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-all",
          mode === 'draw'
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
        )}
        title="Draw mode: Click/drag to paint"
      >
        <Paintbrush className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Draw</span>
      </button>
    </div>
  );
}
