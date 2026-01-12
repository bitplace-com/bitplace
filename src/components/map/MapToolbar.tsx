import { PixelIcon } from '@/components/icons';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { GlassPanel } from '@/components/ui/glass-panel';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
  return (
    <GlassPanel variant="hud" padding="sm" className="shadow-lg">
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
    </GlassPanel>
  );
}
