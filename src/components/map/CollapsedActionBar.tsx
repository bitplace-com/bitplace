import { Loader2 } from 'lucide-react';
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
  isProcessing?: boolean;
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
  isProcessing = false,
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
        isProcessing && "border-primary/50 animate-pulse",
        className
      )}
    >
      <div className="flex items-center gap-3">
        {/* Mode icon with color swatch for PAINT - show loader when processing */}
        <div className={cn(
          "flex items-center justify-center h-8 w-8 rounded-lg bg-muted",
          isProcessing ? "text-primary" : config.color
        )}>
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : mode === 'PAINT' && selectedColor ? (
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

        {/* Mode label + pixel count / Processing state */}
        <div className="flex flex-col items-start">
          <span className="text-sm font-medium text-foreground">
            {isProcessing ? 'Processing...' : config.label}
          </span>
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

        {/* Expand chevron or processing indicator */}
        {isProcessing ? (
          <div className="h-5 w-5 flex items-center justify-center">
            <div className="h-2 w-2 rounded-full bg-primary animate-ping" />
          </div>
        ) : (
          <PixelIcon name="chevronUp" className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
    </button>
  );
}
