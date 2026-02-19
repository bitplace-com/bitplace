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

const modes: { value: MapMode; icon: React.ReactNode; label: string }[] = [
  { value: 'paint', icon: <PixelIcon name="brush" size="sm" />, label: 'Paint' },
  { value: 'defend', icon: <PixelIcon name="shield" size="sm" />, label: 'Defend' },
  { value: 'attack', icon: <PixelIcon name="swords" size="sm" />, label: 'Attack' },
  { value: 'reinforce', icon: <PixelIcon name="bolt" size="sm" />, label: 'Reinforce' },
];

export function MapToolbar({ mode, onModeChange }: MapToolbarProps) {
  const isMobile = useIsMobile();
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active mode when expanded
  useEffect(() => {
    if (isExpanded && scrollRef.current) {
      const activeBtn = scrollRef.current.querySelector('[data-state="on"]') as HTMLElement;
      if (activeBtn) {
        requestAnimationFrame(() => {
          activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        });
      }
    }
  }, [mode, isExpanded]);

  const currentMode = modes.find((m) => m.value === mode);

  const handleModeChange = (value: string | undefined) => {
    if (!value) return;
    hapticsEngine.trigger('medium');
    onModeChange(value as MapMode);
  };

  if (isMobile) {
    return (
      <GlassPanel variant="hud" padding="sm" className="shadow-lg" data-tour="toolbar">
        <div className="flex items-center gap-0.5">
          <div
            className={cn(
              "transition-all duration-300 ease-out overflow-hidden",
              isExpanded ? "max-w-[200px] opacity-100" : "max-w-0 opacity-0"
            )}
          >
            <div ref={scrollRef} className="overflow-x-auto scrollbar-hide">
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
                    onMouseDown={(e) => e.preventDefault()}
                    className="map-toolbar-btn flex items-center gap-1.5 px-2.5 py-2 rounded-xl transition-all duration-200 text-[var(--hud-text)] hover:bg-black/5 dark:hover:bg-white/10 whitespace-nowrap shrink-0"
                  >
                    {icon}
                    <span className="text-xs font-medium">{label}</span>
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          </div>

          <button
            onClick={() => {
              hapticsEngine.trigger('light');
              setIsExpanded(!isExpanded);
            }}
            onMouseDown={(e) => e.preventDefault()}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl transition-all duration-200 text-[var(--hud-text)] hover:bg-black/5 dark:hover:bg-white/10 shrink-0"
            aria-label={isExpanded ? "Collapse toolbar" : "Expand toolbar"}
          >
            {!isExpanded && (
              <>
                {currentMode?.icon}
                <span className="text-xs font-medium">{currentMode?.label}</span>
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

  // Desktop: collapsible, starts expanded
  return (
    <GlassPanel variant="hud" padding="sm" className="shadow-lg" data-tour="toolbar">
      <div className="flex items-center gap-0.5">
        <div
          className={cn(
            "transition-all duration-300 ease-out overflow-hidden",
            isExpanded ? "opacity-100" : "max-w-0 opacity-0"
          )}
        >
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
                onMouseDown={(e) => e.preventDefault()}
                className="map-toolbar-btn flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition-all duration-200 text-[var(--hud-text)] hover:bg-black/5 dark:hover:bg-white/10 whitespace-nowrap shrink-0"
              >
                {icon}
                <span className="text-sm font-medium">{label}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <button
          onClick={() => {
            hapticsEngine.trigger('light');
            setIsExpanded(!isExpanded);
          }}
          onMouseDown={(e) => e.preventDefault()}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl transition-all duration-200 text-[var(--hud-text)] hover:bg-black/5 dark:hover:bg-white/10 shrink-0"
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