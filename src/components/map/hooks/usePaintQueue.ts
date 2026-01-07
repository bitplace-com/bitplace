import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { useGameActions } from '@/hooks/useGameActions';
import { useWallet } from '@/contexts/WalletContext';
import { soundEngine } from '@/lib/soundEngine';

const BATCH_INTERVAL_MS = 250;
const MAX_BATCH_SIZE = 200;
const RECENTLY_COMMITTED_TTL_MS = 500; // 500ms cooldown per pixel

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
  const { refreshUser, updatePeStatus } = useWallet();
  
  // Store color for the current painting session
  const currentColorRef = useRef<string>('#FFFFFF');
  const flushingRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track recently committed pixels to prevent double-commit
  const recentlyCommittedRef = useRef<Map<string, number>>(new Map());

  const addToQueue = useCallback((x: number, y: number, color: string) => {
    currentColorRef.current = color;
    const key = `${x}:${y}`;
    
    // Check if pixel was recently committed (TTL guard)
    const now = Date.now();
    const lastCommitted = recentlyCommittedRef.current.get(key);
    if (lastCommitted && (now - lastCommitted) < RECENTLY_COMMITTED_TTL_MS) {
      // Skip - already committed recently, prevent double-charge
      return;
    }
    
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
    // Safety check - don't flush if not authenticated
    const token = localStorage.getItem('bitplace_session_token');
    if (!token) {
      console.warn('[usePaintQueue] No session token, clearing queue');
      setQueue(new Set());
      return;
    }
    
    // Atomic capture: get queue, check flushing, clear queue all in one operation
    let pixelsToCommit: { x: number; y: number }[] = [];
    let shouldProcess = false;
    
    setQueue(currentQueue => {
      // Already flushing or empty queue - no-op
      if (flushingRef.current || currentQueue.size === 0) {
        return currentQueue;
      }
      
      // Capture pixels
      pixelsToCommit = Array.from(currentQueue).map(key => {
        const [x, y] = key.split(':').map(Number);
        return { x, y };
      });
      
      // Set flushing flag
      flushingRef.current = true;
      shouldProcess = true;
      
      // Clear queue immediately after capturing
      return new Set();
    });
    
    // Process outside of setState if we captured pixels
    if (!shouldProcess || pixelsToCommit.length === 0) {
      return;
    }
    
    setIsFlushing(true);
    const color = currentColorRef.current;
    
    try {
      const validateResult = await validate({ mode: 'PAINT', pixels: pixelsToCommit, color });
      
      if (!validateResult?.ok) {
        setIsSpacePainting(false);
        return;
      }
      
      const commitResult = await commit({
        mode: 'PAINT',
        pixels: pixelsToCommit,
        color,
        snapshotHash: validateResult.snapshotHash,
      });
      
      if (commitResult) {
        // Mark all committed pixels with timestamp for TTL guard
        const now = Date.now();
        pixelsToCommit.forEach(({ x, y }) => {
          confirmPixel(x, y);
          recentlyCommittedRef.current.set(`${x}:${y}`, now);
        });
        
        // Update PE status from commit response (server truth)
        if (commitResult.peStatus) {
          console.log('[usePaintQueue] Commit peStatus:', commitResult.peStatus);
          updatePeStatus(commitResult.peStatus);
        } else {
          console.warn('[usePaintQueue] No peStatus in commit response');
        }
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
  }, [validate, commit, confirmPixel, refreshUser, updatePeStatus]);

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

  // Cleanup stale TTL entries periodically
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      const staleThreshold = RECENTLY_COMMITTED_TTL_MS * 2;
      recentlyCommittedRef.current.forEach((timestamp, key) => {
        if (now - timestamp > staleThreshold) {
          recentlyCommittedRef.current.delete(key);
        }
      });
    }, 1000);
    return () => clearInterval(cleanup);
  }, []);

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
