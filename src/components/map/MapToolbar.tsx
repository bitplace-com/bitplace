import { useState, useEffect, useRef } from 'react';
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

const modes: { value: MapMode; icon: React.ReactNode; label: string; shortLabel: string }[] = [
  { value: 'paint', icon: <PixelIcon name="brush" size="sm" />, label: 'Paint', shortLabel: 'Paint' },
  { value: 'defend', icon: <PixelIcon name="shield" size="sm" />, label: 'Defend', shortLabel: 'Defend' },
  { value: 'attack', icon: <PixelIcon name="swords" size="sm" />, label: 'Attack', shortLabel: 'Attack' },
  { value: 'reinforce', icon: <PixelIcon name="bolt" size="sm" />, label: 'Reinforce', shortLabel: 'Boost' },
];

export function MapToolbar({ mode, onModeChange }: MapToolbarProps) {
  const isMobile = useIsMobile();
  const [isExpanded, setIsExpanded] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sync expansion state with screen size changes
  useEffect(() => {
    setIsExpanded(!isMobile);
  }, [isMobile]);

  // Auto-scroll to active mode when expanding on mobile
  useEffect(() => {
    if (isExpanded && isMobile && scrollRef.current) {
      const activeBtn = scrollRef.current.querySelector('[data-state="on"]') as HTMLElement;
      if (activeBtn) {
        requestAnimationFrame(() => {
          activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        });
      }
    }
  }, [isExpanded, isMobile]);

  const currentMode = modes.find((m) => m.value === mode);

  // Handle mode change - auto-collapse after selection with haptic feedback
  const handleModeChange = (value: string | undefined) => {
    if (!value) return;
    
    hapticsEngine.trigger('medium');
    onModeChange(value as MapMode);
    
    // Auto-collapse on mobile after a brief delay
    if (isMobile) {
      setTimeout(() => {
        setIsExpanded(false);
      }, 150);
    }
  };

  return (
    <GlassPanel variant="hud" padding="sm" className="shadow-lg">
      <div className="flex items-center gap-0.5">
        {/* Expandable modes section */}
        <div
          className={cn(
            "transition-all duration-300 ease-out overflow-hidden",
            isExpanded ? "opacity-100" : "max-w-0 opacity-0"
          )}
        >
          <div ref={scrollRef} className="overflow-x-auto scrollbar-hide">
            <ToggleGroup
              type="single"
              value={mode}
              onValueChange={handleModeChange}
              className="gap-0.5 flex-nowrap w-max"
            >
              {modes.map(({ value, icon, label, shortLabel }) => (
                <ToggleGroupItem
                  key={value}
                  value={value}
                  aria-label={label}
                  className="map-toolbar-btn flex items-center gap-1.5 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all duration-200 text-[var(--hud-text)] hover:bg-black/5 dark:hover:bg-white/10 whitespace-nowrap shrink-0"
                >
                  {icon}
                  <span className="text-xs sm:text-sm font-medium">
                    {isMobile ? shortLabel : label}
                  </span>
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
          className="flex items-center gap-1.5 px-2 sm:px-3 py-2 sm:py-2.5 rounded-xl transition-all duration-200 text-[var(--hud-text)] hover:bg-black/5 dark:hover:bg-white/10 shrink-0"
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
