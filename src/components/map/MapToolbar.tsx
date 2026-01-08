import { Paintbrush, Shield, Swords, Zap } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { GlassPanel } from '@/components/ui/glass-panel';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { type MapMode } from './hooks/useMapState';

interface MapToolbarProps {
  mode: MapMode;
  onModeChange: (mode: MapMode) => void;
}

const modes: { value: MapMode; icon: React.ReactNode; label: string; hint: string }[] = [
  { value: 'paint', icon: <Paintbrush className="h-4 w-4" />, label: 'Paint', hint: 'Click or drag to paint pixels' },
  { value: 'defend', icon: <Shield className="h-4 w-4" />, label: 'Defend', hint: 'Click pixels to add defense' },
  { value: 'attack', icon: <Swords className="h-4 w-4" />, label: 'Attack', hint: 'Click pixels to attack them' },
  { value: 'reinforce', icon: <Zap className="h-4 w-4" />, label: 'Reinforce', hint: 'Click your pixels to reinforce' },
];

export function MapToolbar({ mode, onModeChange }: MapToolbarProps) {
  console.log('[MapToolbar] current mode:', mode);
  return (
    <GlassPanel variant="hud" padding="sm" className="shadow-lg">
      <ToggleGroup
        type="single"
        value={mode}
        onValueChange={(value) => {
          console.log('[MapToolbar] onValueChange:', value);
          if (value) onModeChange(value as MapMode);
        }}
        className="gap-1"
      >
        {modes.map(({ value, icon, label, hint }) => (
          <Tooltip key={value}>
            <TooltipTrigger asChild>
              <ToggleGroupItem
                value={value}
                aria-label={label}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl transition-all duration-200 text-[var(--hud-text)] hover:bg-black/5 dark:hover:bg-white/10 data-[state=on]:!bg-foreground data-[state=on]:!text-background data-[state=on]:shadow-md"
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
