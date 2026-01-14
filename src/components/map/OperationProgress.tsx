import { Loader2, AlertCircle } from 'lucide-react';
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
  isStalled?: boolean;
  className?: string;
}

export function OperationProgress({
  isActive,
  operation,
  mode,
  progress,
  isStalled = false,
  className,
}: OperationProgressProps) {
  // Show for any active operation with progress (removed 50px minimum - PROMPT 44)
  if (!isActive || !progress) {
    return null;
  }

  const percent = progress.total > 0 
    ? Math.floor((progress.processed / progress.total) * 100) 
    : 0;
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
        {/* Stall indicator - PROMPT 44 */}
        {isStalled && (
          <div className="flex items-center gap-1 text-amber-500">
            <AlertCircle className="h-3 w-3" />
            <span>Still working...</span>
          </div>
        )}
      </div>
    </div>
  );
}
