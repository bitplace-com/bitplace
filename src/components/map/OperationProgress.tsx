import { useEffect, useState, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { GameMode } from '@/hooks/useGameActions';

// Estimated time per pixel for each operation type (ms)
const VALIDATE_MS_PER_PIXEL = 50;
const COMMIT_MS_PER_PIXEL = 80;
const BASE_OVERHEAD_MS = 2000;

// Status messages that rotate during operations
const STATUS_MESSAGES = {
  validate: [
    'Preparing validation...',
    'Checking pixel states...',
    'Calculating PE requirements...',
    'Almost done...',
  ],
  commit: {
    PAINT: ['Preparing canvas...', 'Painting pixels...', 'Saving artwork...', 'Finalizing...'],
    DEFEND: ['Setting up defenses...', 'Applying shields...', 'Finalizing...'],
    ATTACK: ['Planning attack...', 'Executing...', 'Finalizing...'],
    REINFORCE: ['Boosting defenses...', 'Applying reinforcements...', 'Finalizing...'],
    ERASE: ['Preparing cleanup...', 'Erasing pixels...', 'Refunding PE...', 'Finalizing...'],
  },
};

interface OperationProgressProps {
  isActive: boolean;
  operation: 'validate' | 'commit';
  mode: GameMode;
  pixelCount: number;
  startedAt: number | null;
  className?: string;
}

export function OperationProgress({
  isActive,
  operation,
  mode,
  pixelCount,
  startedAt,
  className,
}: OperationProgressProps) {
  const [elapsed, setElapsed] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);

  // Calculate estimated duration
  const estimatedDuration = useMemo(() => {
    const msPerPixel = operation === 'validate' ? VALIDATE_MS_PER_PIXEL : COMMIT_MS_PER_PIXEL;
    return BASE_OVERHEAD_MS + pixelCount * msPerPixel;
  }, [operation, pixelCount]);

  // Get current status messages
  const messages = useMemo(() => {
    if (operation === 'validate') {
      return STATUS_MESSAGES.validate;
    }
    return STATUS_MESSAGES.commit[mode] || STATUS_MESSAGES.commit.PAINT;
  }, [operation, mode]);

  // Update elapsed time
  useEffect(() => {
    if (!isActive || !startedAt) {
      setElapsed(0);
      setMessageIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsed(Date.now() - startedAt);
    }, 100);

    return () => clearInterval(interval);
  }, [isActive, startedAt]);

  // Rotate messages every 3 seconds
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % messages.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [isActive, messages.length]);

  // Calculate progress percentage (cap at 95% until complete)
  const progressPercent = useMemo(() => {
    if (!isActive || !startedAt) return 0;
    const progress = (elapsed / estimatedDuration) * 100;
    return Math.min(95, Math.max(0, progress));
  }, [elapsed, estimatedDuration, isActive, startedAt]);

  if (!isActive || pixelCount < 50) {
    return null;
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      <Progress value={progressPercent} className="h-1" />
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span className="animate-pulse">{messages[messageIndex]}</span>
        </div>
        <span className="tabular-nums">
          {Math.round(progressPercent)}%
        </span>
      </div>
    </div>
  );
}

// Hook for managing operation timing state
export function useOperationProgress() {
  const [operationStartTime, setOperationStartTime] = useState<number | null>(null);
  const [operationPixelCount, setOperationPixelCount] = useState(0);
  const [operationType, setOperationType] = useState<'validate' | 'commit' | null>(null);

  const startOperation = (type: 'validate' | 'commit', pixelCount: number) => {
    setOperationType(type);
    setOperationPixelCount(pixelCount);
    setOperationStartTime(Date.now());
  };

  const endOperation = () => {
    setOperationType(null);
    setOperationStartTime(null);
  };

  return {
    operationType,
    operationStartTime,
    operationPixelCount,
    startOperation,
    endOperation,
  };
}
