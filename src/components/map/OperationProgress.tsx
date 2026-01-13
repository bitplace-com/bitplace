import { useEffect, useState, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { GameMode } from '@/hooks/useGameActions';

// Status messages for each phase
const STATUS_MESSAGES = {
  validate: 'Validating',
  commit: {
    PAINT: 'Painting',
    DEFEND: 'Defending',
    ATTACK: 'Attacking',
    REINFORCE: 'Reinforcing',
    ERASE: 'Erasing',
  },
};

interface OperationProgressProps {
  isActive: boolean;
  operation: 'validate' | 'commit';
  mode: GameMode;
  progress: { processed: number; total: number } | null;
  className?: string;
}

export function OperationProgress({
  isActive,
  operation,
  mode,
  progress,
  className,
}: OperationProgressProps) {
  // Only show for active operations with real progress and >= 50 pixels
  if (!isActive || !progress || progress.total < 50) {
    return null;
  }

  const percent = Math.floor((progress.processed / progress.total) * 100);
  const phaseLabel = operation === 'validate' 
    ? STATUS_MESSAGES.validate 
    : STATUS_MESSAGES.commit[mode] || 'Processing';

  return (
    <div className={cn('space-y-1.5', className)}>
      <Progress value={percent} className="h-1" />
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>{phaseLabel}... {percent}% ({progress.processed}/{progress.total})</span>
        </div>
      </div>
    </div>
  );
}
