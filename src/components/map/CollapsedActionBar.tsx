import { PixelIcon } from '@/components/icons';
import { PEIcon } from '@/components/ui/pe-icon';
import type { GameMode } from '@/hooks/useGameActions';
import { cn } from '@/lib/utils';

interface CollapsedActionBarProps {
  mode: GameMode;
  pixelCount: number;
  requiredPe: number;
  selectedColor?: string | null;
  onExpand: () => void;
  className?: string;
}

const modeConfig: Record<GameMode, { iconName: 'brush' | 'shield' | 'swords' | 'eraser'; label: string; color: string }> = {
  PAINT: { iconName: 'brush', label: 'Paint', color: 'text-foreground' },
  DEFEND: { iconName: 'shield', label: 'Defend', color: 'text-emerald-500' },
  ATTACK: { iconName: 'swords', label: 'Attack', color: 'text-rose-500' },
  REINFORCE: { iconName: 'shield', label: 'Reinforce', color: 'text-amber-500' },
  ERASE: { iconName: 'eraser', label: 'Erase', color: 'text-muted-foreground' },
};

export function CollapsedActionBar({
  mode,
  pixelCount,
  requiredPe,
  selectedColor,
  onExpand,
  className,
}: CollapsedActionBarProps) {
  const config = modeConfig[mode];

  return (
    <button
      type="button"
      onClick={onExpand}
      className={cn(
        "w-full flex items-center justify-between",
        "px-4 py-3 rounded-xl",
        "glass-hud border border-border/50",
        "active:scale-[0.98] transition-transform",
        "touch-target",
        className
      )}
    >
      <div className="flex items-center gap-3">
        {/* Mode icon with color swatch for PAINT */}
        <div className={cn(
          "flex items-center justify-center h-8 w-8 rounded-lg bg-muted",
          config.color
        )}>
          {mode === 'PAINT' && selectedColor ? (
            <div
              className="h-5 w-5 rounded border border-border/50"
              style={{ backgroundColor: selectedColor }}
            />
          ) : mode === 'REINFORCE' ? (
            <PEIcon size="sm" />
          ) : (
            <PixelIcon name={config.iconName} className="h-4 w-4" />
          )}
        </div>

        {/* Mode label + pixel count */}
        <div className="flex flex-col items-start">
          <span className="text-sm font-medium text-foreground">{config.label}</span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {pixelCount.toLocaleString()} px
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* PE estimate */}
        <div className="flex items-center gap-1.5 text-sm tabular-nums">
          <PEIcon size="xs" />
          <span className="text-muted-foreground">~</span>
          <span className="font-medium">{requiredPe.toLocaleString()}</span>
        </div>

        {/* Expand chevron */}
        <PixelIcon name="chevronUp" className="h-5 w-5 text-muted-foreground" />
      </div>
    </button>
  );
}
