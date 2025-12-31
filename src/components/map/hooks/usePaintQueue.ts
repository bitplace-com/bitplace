import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { useGameActions } from '@/hooks/useGameActions';
import { useWallet } from '@/contexts/WalletContext';
import { soundEngine } from '@/lib/soundEngine';
const BATCH_INTERVAL_MS = 250;
const MAX_BATCH_SIZE = 200;

interface UsePaintQueueResult {
  queue: Set<string>;
  queueSize: number;
  isSpacePainting: boolean;
  isFlushing: boolean;
  startSpacePaint: () => void;
  stopSpacePaint: () => void;
  addToQueue: (x: number, y: number, color: string) => void;
  flushQueue: () => Promise<void>;
  clearQueue: () => void;
}

export function usePaintQueue(
  paintPixel: (x: number, y: number, color: string) => void,
  confirmPixel: (x: number, y: number) => void
): UsePaintQueueResult {
  const [queue, setQueue] = useState<Set<string>>(new Set());
  const [isSpacePainting, setIsSpacePainting] = useState(false);
  const [isFlushing, setIsFlushing] = useState(false);
  
  const { validate, commit } = useGameActions();
  const { refreshUser } = useWallet();
  
  // Store color for the current painting session
  const currentColorRef = useRef<string>('#FFFFFF');
  const flushingRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const addToQueue = useCallback((x: number, y: number, color: string) => {
    currentColorRef.current = color;
    const key = `${x}:${y}`;
    setQueue(prev => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    // Optimistic local paint
    paintPixel(x, y, color);
  }, [paintPixel]);

  const clearQueue = useCallback(() => {
    setQueue(new Set());
  }, []);

  const flushQueue = useCallback(async () => {
    if (flushingRef.current) return;
    
    setQueue(currentQueue => {
      if (currentQueue.size === 0) return currentQueue;
      
      flushingRef.current = true;
      setIsFlushing(true);
      
      const pixels = Array.from(currentQueue).map(key => {
        const [x, y] = key.split(':').map(Number);
        return { x, y };
      });
      
      const color = currentColorRef.current;
      
      // Process async
      (async () => {
        try {
          const result = await validate({ mode: 'PAINT', pixels, color });
          
          if (!result?.ok) {
            setIsSpacePainting(false);
            return;
          }
          
          const success = await commit({
            mode: 'PAINT',
            pixels,
            color,
            snapshotHash: result.snapshotHash,
          });
          
          if (success) {
            pixels.forEach(({ x, y }) => confirmPixel(x, y));
            refreshUser();
            soundEngine.play('paint_commit');
          } else {
            setIsSpacePainting(false);
          }
        } catch (err) {
          console.error('[usePaintQueue] Flush error:', err);
          toast.error('Paint batch failed');
          setIsSpacePainting(false);
        } finally {
          flushingRef.current = false;
          setIsFlushing(false);
        }
      })();
      
      // Clear queue immediately after capturing pixels
      return new Set();
    });
  }, [validate, commit, confirmPixel, refreshUser]);

  const startSpacePaint = useCallback(() => {
    setIsSpacePainting(true);
  }, []);

  const stopSpacePaint = useCallback(() => {
    setIsSpacePainting(false);
    // Flush remaining on stop
    flushQueue();
  }, [flushQueue]);

  // Auto-flush interval
  useEffect(() => {
    if (!isSpacePainting) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      flushQueue();
    }, BATCH_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isSpacePainting, flushQueue]);

  // Auto-flush when batch size reached
  useEffect(() => {
    if (queue.size >= MAX_BATCH_SIZE) {
      flushQueue();
    }
  }, [queue.size, flushQueue]);

  return {
    queue,
    queueSize: queue.size,
    isSpacePainting,
    isFlushing,
    startSpacePaint,
    stopSpacePaint,
    addToQueue,
    flushQueue,
    clearQueue,
  };
}
