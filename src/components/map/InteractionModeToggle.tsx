import { Hand, Paintbrush, Shield, Swords, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MapMode } from './hooks/useMapState';

export type InteractionMode = 'drag' | 'draw';

interface InteractionModeToggleProps {
  mode: InteractionMode;
  mapMode: MapMode;
  onModeChange: (mode: InteractionMode) => void;
  disabled?: boolean;
}

// Get the correct action icon based on map mode
function ActionIcon({ mapMode }: { mapMode: MapMode }) {
  switch (mapMode) {
    case 'defend':
      return <Shield className="h-3.5 w-3.5" />;
    case 'attack':
      return <Swords className="h-3.5 w-3.5" />;
    case 'reinforce':
      return <Zap className="h-3.5 w-3.5" />;
    default:
      return <Paintbrush className="h-3.5 w-3.5" />;
  }
}

// Get the action label based on map mode
function getActionLabel(mapMode: MapMode): string {
  switch (mapMode) {
    case 'defend':
      return 'Defend';
    case 'attack':
      return 'Attack';
    case 'reinforce':
      return 'Reinforce';
    default:
      return 'Draw';
  }
}

// Get the action tooltip based on map mode
function getActionTooltip(mapMode: MapMode): string {
  switch (mapMode) {
    case 'defend':
      return 'Defend mode: Click/drag to select pixels';
    case 'attack':
      return 'Attack mode: Click/drag to select pixels';
    case 'reinforce':
      return 'Reinforce mode: Click/drag to select pixels';
    default:
      return 'Draw mode: Click/drag to paint';
  }
}

export function InteractionModeToggle({
  mode,
  mapMode,
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
        title="Hand mode: Pan map, click to inspect"
      >
        <Hand className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Hand</span>
      </button>
      <button
        onClick={() => onModeChange('draw')}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-all",
          mode === 'draw'
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
        )}
        title={getActionTooltip(mapMode)}
      >
        <ActionIcon mapMode={mapMode} />
        <span className="hidden sm:inline">{getActionLabel(mapMode)}</span>
      </button>
    </div>
  );
}
