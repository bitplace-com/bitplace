import { useRef, useEffect } from 'react';
import { PixelIcon } from '@/components/icons';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { GlassPanel } from '@/components/ui/glass-panel';
import { hapticsEngine } from '@/lib/hapticsEngine';
import { type MapMode } from './hooks/useMapState';

interface MapToolbarProps {
  mode: MapMode;
  onModeChange: (mode: MapMode) => void;
}

const modes: { value: MapMode; icon: React.ReactNode; label: string }[] = [
  { value: 'paint', icon: <PixelIcon name="brush" size="sm" />, label: 'Paint' },
  { value: 'defend', icon: <PixelIcon name="shield" size="sm" />, label: 'Defend' },
  { value: 'attack', icon: <PixelIcon name="swords" size="sm" />, label: 'Attack' },
  { value: 'reinforce', icon: <PixelIcon name="bolt" size="sm" />, label: 'Reinforce' },
];

export function MapToolbar({ mode, onModeChange }: MapToolbarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active mode on mount
  useEffect(() => {
    if (scrollRef.current) {
      const activeBtn = scrollRef.current.querySelector('[data-state="on"]') as HTMLElement;
      if (activeBtn) {
        requestAnimationFrame(() => {
          activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        });
      }
    }
  }, [mode]);

  const handleModeChange = (value: string | undefined) => {
    if (!value) return;
    hapticsEngine.trigger('medium');
    onModeChange(value as MapMode);
  };

  return (
    <GlassPanel variant="hud" padding="sm" className="shadow-lg max-w-[calc(100vw-2rem)]">
      <div ref={scrollRef} className="overflow-x-auto toolbar-scroll">
        <ToggleGroup
          type="single"
          value={mode}
          onValueChange={handleModeChange}
          className="gap-0.5 flex-nowrap w-max"
        >
          {modes.map(({ value, icon, label }) => (
            <ToggleGroupItem
              key={value}
              value={value}
              aria-label={label}
              className="map-toolbar-btn flex items-center gap-1.5 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all duration-200 text-[var(--hud-text)] hover:bg-black/5 dark:hover:bg-white/10 whitespace-nowrap shrink-0"
            >
              {icon}
              <span className="text-xs sm:text-sm font-medium">{label}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    </GlassPanel>
  );
}
