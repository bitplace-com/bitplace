import { Paintbrush, Shield, Swords, Plus } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
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
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
      <div className="bg-secondary/95 backdrop-blur-sm rounded-lg border border-border shadow-lg p-1">
        <ToggleGroup
          type="single"
          value={mode}
          onValueChange={(value) => value && onModeChange(value as MapMode)}
        >
          {modes.map(({ value, icon, label }) => (
            <ToggleGroupItem
              key={value}
              value={value}
              aria-label={label}
              className="flex items-center gap-2 px-3 py-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              {icon}
              <span className="text-sm hidden sm:inline">{label}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    </div>
  );
}
