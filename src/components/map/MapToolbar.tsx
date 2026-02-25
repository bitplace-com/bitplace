import { useState, useEffect, useRef } from 'react';
import { PixelIcon } from '@/components/icons';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { GlassPanel } from '@/components/ui/glass-panel';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { hapticsEngine } from '@/lib/hapticsEngine';
import { type MapMode } from './hooks/useMapState';

interface MapToolbarProps {
  mode: MapMode;
  onModeChange: (mode: MapMode) => void;
  isGoogleOnly?: boolean;
}

const modes: { value: MapMode; icon: React.ReactNode; label: string }[] = [
  { value: 'paint', icon: <PixelIcon name="brush" size="sm" />, label: 'Paint' },
  { value: 'defend', icon: <PixelIcon name="shield" size="sm" />, label: 'Defend' },
  { value: 'attack', icon: <PixelIcon name="swords" size="sm" />, label: 'Attack' },
  { value: 'reinforce', icon: <PixelIcon name="bolt" size="sm" />, label: 'Reinforce' },
];

const restrictedModes: MapMode[] = ['defend', 'attack', 'reinforce'];

export function MapToolbar({ mode, onModeChange, isGoogleOnly = false }: MapToolbarProps) {
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
    if (isGoogleOnly && restrictedModes.includes(value as MapMode)) return;
    hapticsEngine.trigger('medium');
    onModeChange(value as MapMode);
  };

  const renderToggleItem = (value: MapMode, icon: React.ReactNode, label: string) => {
    const isRestricted = isGoogleOnly && restrictedModes.includes(value);
    const item = (
      <ToggleGroupItem
        key={value}
        value={value}
        aria-label={label}
        disabled={isRestricted}
        onMouseDown={(e) => e.preventDefault()}
        className={cn(
          "map-toolbar-btn flex items-center gap-1.5 rounded-xl transition-all duration-200 text-[var(--hud-text)] hover:bg-black/5 dark:hover:bg-white/10 whitespace-nowrap shrink-0",
          isMobile ? "px-2.5 py-2" : "px-4 py-2.5",
          isRestricted && "opacity-40 cursor-not-allowed"
        )}
      >
        {icon}
        <span className={cn("font-medium", isMobile ? "text-xs" : "text-sm")}>{label}</span>
      </ToggleGroupItem>
    );

    if (isRestricted) {
      return (
        <Tooltip key={value}>
          <TooltipTrigger asChild>{item}</TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Connect wallet to use this action
          </TooltipContent>
        </Tooltip>
      );
    }
    return item;
  };

  if (isMobile) {
    return (
      <TooltipProvider delayDuration={300}>
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
                  {modes.map(({ value, icon, label }) => renderToggleItem(value, icon, label))}
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
      </TooltipProvider>
    );
  }

  // Desktop: collapsible, starts expanded
  return (
    <TooltipProvider delayDuration={300}>
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
              {modes.map(({ value, icon, label }) => renderToggleItem(value, icon, label))}
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
    </TooltipProvider>
  );
}