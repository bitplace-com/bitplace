import { useState, useEffect } from 'react';
import { PixelIcon } from '@/components/icons';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { GlassPanel } from '@/components/ui/glass-panel';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
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
  const isMobile = useIsMobile();
  const [isExpanded, setIsExpanded] = useState(true);

  // Sync expansion state with screen size changes
  useEffect(() => {
    setIsExpanded(!isMobile);
  }, [isMobile]);

  const currentMode = modes.find((m) => m.value === mode);

  // Handle mode change - auto-collapse after selection with haptic feedback
  const handleModeChange = (value: string | undefined) => {
    if (!value) return;
    
    // Haptic feedback on mode switch
    hapticsEngine.trigger('medium');
    
    onModeChange(value as MapMode);
    
    // Auto-collapse after a brief delay for visual feedback
    setTimeout(() => {
      setIsExpanded(false);
    }, 150);
  };

  return (
    <GlassPanel variant="hud" padding="sm" className="shadow-lg">
      <div className="flex items-center gap-1">
        {/* Expandable modes section - horizontal animation */}
        <div
          className={cn(
            "grid transition-all duration-300 ease-out",
            isExpanded ? "grid-cols-[1fr]" : "grid-cols-[0fr]"
          )}
        >
          <div className="overflow-x-auto scrollbar-hide">
            <ToggleGroup
              type="single"
              value={mode}
              onValueChange={handleModeChange}
              className="gap-1 flex-nowrap"
            >
              {modes.map(({ value, icon, label }) => (
                <ToggleGroupItem
                  key={value}
                  value={value}
                  aria-label={label}
                  className="map-toolbar-btn flex items-center gap-2.5 px-4 py-2.5 rounded-xl transition-all duration-200 text-[var(--hud-text)] hover:bg-black/5 dark:hover:bg-white/10 whitespace-nowrap"
                >
                  {icon}
                  <span className="text-sm font-medium hidden sm:inline">{label}</span>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </div>

        {/* Toggle button - always visible */}
        <button
          onClick={() => {
            hapticsEngine.trigger('light');
            setIsExpanded(!isExpanded);
          }}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-200 text-[var(--hud-text)] hover:bg-black/5 dark:hover:bg-white/10 shrink-0"
          aria-label={isExpanded ? "Collapse toolbar" : "Expand toolbar"}
        >
          {!isExpanded && (
            <>
              {currentMode?.icon}
              <span className="text-sm font-medium">{currentMode?.label}</span>
            </>
          )}
          <PixelIcon 
            name={isExpanded ? "chevronLeft" : "chevronRight"} 
            className="h-4 w-4 text-muted-foreground transition-transform duration-300" 
          />
        </button>
      </div>
    </GlassPanel>
  );
}
