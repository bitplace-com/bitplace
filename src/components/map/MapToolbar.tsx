import { Paintbrush, Shield, Swords, Plus } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { GlassPanel } from '@/components/ui/glass-panel';
import { type MapMode } from './hooks/useMapState';

interface MapToolbarProps {
  mode: MapMode;
  onModeChange: (mode: MapMode) => void;
}

const modes: { value: MapMode; icon: React.ReactNode; label: string }[] = [
  { value: 'paint', icon: <Paintbrush className="h-4 w-4" />, label: 'Paint' },
  { value: 'defend', icon: <Shield className="h-4 w-4" />, label: 'Defend' },
  { value: 'attack', icon: <Swords className="h-4 w-4" />, label: 'Attack' },
  { value: 'reinforce', icon: <Plus className="h-4 w-4" />, label: 'Reinforce' },
];

export function MapToolbar({ mode, onModeChange }: MapToolbarProps) {
  return (
    <GlassPanel padding="sm" className="shadow-lg">
      <ToggleGroup
        type="single"
        value={mode}
        onValueChange={(value) => value && onModeChange(value as MapMode)}
        className="gap-1"
      >
        {modes.map(({ value, icon, label }) => (
          <ToggleGroupItem
            key={value}
            value={value}
            aria-label={label}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl transition-all duration-200 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-md hover:bg-muted/50"
          >
            {icon}
            <span className="text-sm font-medium hidden sm:inline">{label}</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </GlassPanel>
  );
}
