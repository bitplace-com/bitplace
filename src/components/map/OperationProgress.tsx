import { useState, useEffect, useRef } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
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

/**
 * Simulated progress using a logarithmic curve:
 * - Advances quickly to ~60%, slows down to ~90%, then holds.
 * - When isActive becomes false, jumps to 100% briefly before unmounting.
 */
export function OperationProgress({
  isActive,
  operation,
  mode,
  progress,
  isStalled = false,
  className,
}: OperationProgressProps) {
  const [simPercent, setSimPercent] = useState(0);
  const startTimeRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const [showComplete, setShowComplete] = useState(false);

  // Real progress percent (from SSE stream)
  const realPercent = progress && progress.total > 0
    ? Math.floor((progress.processed / progress.total) * 100)
    : 0;

  // Use real progress if server is actually reporting it, otherwise simulate
  const hasRealProgress = progress && progress.processed > 0;

  // Simulated progress animation
  useEffect(() => {
    if (!isActive) {
      // Operation just finished — flash 100% briefly
      if (simPercent > 0 || (hasRealProgress && realPercent > 0)) {
        setSimPercent(100);
        setShowComplete(true);
        const t = setTimeout(() => {
          setShowComplete(false);
          setSimPercent(0);
        }, 600);
        return () => clearTimeout(t);
      }
      return;
    }

    // Reset on new operation
    setSimPercent(0);
    setShowComplete(false);
    startTimeRef.current = performance.now();

    // If server sends real progress, don't simulate
    if (hasRealProgress) return;

    const animate = (now: number) => {
      const elapsed = (now - startTimeRef.current) / 1000; // seconds
      // Logarithmic curve: fast start, slows toward 90%
      // f(t) = 90 * (1 - e^(-t/8)) — reaches ~60% at 7s, ~80% at 13s, ~88% at 17s
      const target = 90 * (1 - Math.exp(-elapsed / 3));
      setSimPercent(Math.floor(target));
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isActive, hasRealProgress]);

  // Determine which percent to display
  const displayPercent = showComplete ? 100 : hasRealProgress ? realPercent : simPercent;

  // Show when active OR briefly after completion
  if (!isActive && !showComplete) return null;
  if (!progress && !showComplete) return null;

  const phaseLabel = operation === 'validate'
    ? STATUS_MESSAGES.validate
    : STATUS_MESSAGES.commit[mode] || 'Processing';

  return (
    <div className={cn('space-y-1.5', className)}>
      <Progress value={displayPercent} className="h-1" />
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>{phaseLabel}... {displayPercent}%</span>
        </div>
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
