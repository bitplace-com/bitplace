import { useState, useEffect } from 'react';
import { PixelIcon } from '@/components/icons';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { GlassPanel } from '@/components/ui/glass-panel';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { type MapMode } from './hooks/useMapState';

interface MapToolbarProps {
  mode: MapMode;
  onModeChange: (mode: MapMode) => void;
}

const modes: { value: MapMode; icon: React.ReactNode; label: string; hint: string }[] = [
  { value: 'paint', icon: <PixelIcon name="brush" size="sm" />, label: 'Paint', hint: 'Click or drag to paint pixels' },
  { value: 'defend', icon: <PixelIcon name="shield" size="sm" />, label: 'Defend', hint: 'Click pixels to add defense' },
  { value: 'attack', icon: <PixelIcon name="swords" size="sm" />, label: 'Attack', hint: 'Click pixels to attack them' },
  { value: 'reinforce', icon: <PixelIcon name="bolt" size="sm" />, label: 'Reinforce', hint: 'Click your pixels to reinforce' },
];

export function MapToolbar({ mode, onModeChange }: MapToolbarProps) {
  const isMobile = useIsMobile();
  const [isExpanded, setIsExpanded] = useState(true);

  // Sync expansion state with screen size changes
  useEffect(() => {
    setIsExpanded(!isMobile);
  }, [isMobile]);

  const currentMode = modes.find((m) => m.value === mode);

  return (
    <GlassPanel variant="hud" padding="sm" className="shadow-lg">
      {isExpanded ? (
        // Expanded: Show all modes with toggle chevron
        <div className="flex items-center gap-1">
          <ToggleGroup
            type="single"
            value={mode}
            onValueChange={(value) => value && onModeChange(value as MapMode)}
            className="gap-1"
          >
            {modes.map(({ value, icon, label, hint }) => (
              <Tooltip key={value}>
                <TooltipTrigger asChild>
                  <ToggleGroupItem
                    value={value}
                    aria-label={label}
                    className="map-toolbar-btn flex items-center gap-2.5 px-4 py-2.5 rounded-xl transition-all duration-200 text-[var(--hud-text)] hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    {icon}
                    <span className="text-sm font-medium hidden sm:inline">{label}</span>
                  </ToggleGroupItem>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {hint}
                </TooltipContent>
              </Tooltip>
            ))}
          </ToggleGroup>
          <button
            onClick={() => setIsExpanded(false)}
            className="ml-1 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            aria-label="Collapse toolbar"
          >
            <PixelIcon name="chevronUp" className="h-4 w-4 transition-transform duration-200" />
          </button>
        </div>
      ) : (
        // Collapsed: Show current mode only + chevron
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl transition-all duration-200 text-[var(--hud-text)] hover:bg-black/5 dark:hover:bg-white/10"
          aria-label="Expand toolbar"
        >
          {currentMode?.icon}
          <span className="text-sm font-medium">{currentMode?.label}</span>
          <PixelIcon 
            name="chevronDown" 
            className="h-4 w-4 ml-1 text-muted-foreground transition-transform duration-200" 
          />
        </button>
      )}
    </GlassPanel>
  );
}
