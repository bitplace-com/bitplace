import { useState, useEffect, useRef } from 'react';
import { Loader2, AlertCircle, Check } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { GameMode } from '@/hooks/useGameActions';

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
  const [simPercent, setSimPercent] = useState(0);
  const [showComplete, setShowComplete] = useState(false);
  const startTimeRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const wasActiveRef = useRef(false);

  // Real progress percent (from SSE stream)
  const realPercent = progress && progress.total > 0
    ? Math.floor((progress.processed / progress.total) * 100)
    : 0;

  const hasRealProgress = progress && progress.processed > 0;

  // Track isActive transitions with ref
  useEffect(() => {
    if (isActive) {
      // Starting new operation
      wasActiveRef.current = true;
      setShowComplete(false);
      setSimPercent(0);
      startTimeRef.current = performance.now();

      // Don't simulate if server sends real progress
      if (hasRealProgress) return;

      const animate = (now: number) => {
        const elapsed = (now - startTimeRef.current) / 1000;
        const target = 90 * (1 - Math.exp(-elapsed / 3));
        setSimPercent(Math.floor(target));
        rafRef.current = requestAnimationFrame(animate);
      };

      rafRef.current = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(rafRef.current);
    } else if (wasActiveRef.current) {
      // Just finished — flash 100%
      wasActiveRef.current = false;
      cancelAnimationFrame(rafRef.current);
      setSimPercent(100);
      setShowComplete(true);
      const t = setTimeout(() => {
        setShowComplete(false);
        setSimPercent(0);
      }, 600);
      return () => clearTimeout(t);
    }
  }, [isActive]); // Only depend on isActive, not hasRealProgress

  // Determine which percent to display
  const displayPercent = showComplete ? 100 : hasRealProgress ? realPercent : simPercent;

  // Show when active OR briefly after completion
  if (!isActive && !showComplete) return null;

  const phaseLabel = operation === 'validate'
    ? STATUS_MESSAGES.validate
    : STATUS_MESSAGES.commit[mode] || 'Processing';

  return (
    <div className={cn('space-y-1.5', className)}>
      <Progress value={displayPercent} className="h-1" />
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          {showComplete ? (
            <Check className="h-3 w-3 text-emerald-500" />
          ) : (
            <Loader2 className="h-3 w-3 animate-spin" />
          )}
          <span>{showComplete ? 'Done' : `${phaseLabel}... ${displayPercent}%`}</span>
        </div>
        {isStalled && !showComplete && (
          <div className="flex items-center gap-1 text-amber-500">
            <AlertCircle className="h-3 w-3" />
            <span>Still working...</span>
          </div>
        )}
      </div>
    </div>
  );
}
