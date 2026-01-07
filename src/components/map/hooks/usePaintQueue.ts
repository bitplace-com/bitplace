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
  addToQueue: (x: number, y: number, color: string) => boolean;
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
  
  // CRITICAL: Track pending pixels synchronously (not subject to React batching)
  const pendingPixelsRef = useRef<Map<string, string>>(new Map()); // key -> color

  const addToQueue = useCallback((x: number, y: number, color: string): boolean => {
    // CRITICAL: Check auth before any optimistic paint
    const token = localStorage.getItem('bitplace_session_token');
    if (!token) {
      console.warn('[usePaintQueue] No session token, blocking paint');
      return false;
    }
    
    currentColorRef.current = color;
    const key = `${x}:${y}`;
    
    // Check if pixel was recently committed (TTL guard)
    const now = Date.now();
    const lastCommitted = recentlyCommittedRef.current.get(key);
    if (lastCommitted && (now - lastCommitted) < RECENTLY_COMMITTED_TTL_MS) {
      return false;
    }
    
    // CRITICAL: Add to ref synchronously (not subject to React batching)
    pendingPixelsRef.current.set(key, color);
    
    // Also update React state for UI display
    setQueue(prev => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    
    // Optimistic local paint
    paintPixel(x, y, color);
    return true;
  }, [paintPixel]);

  const clearQueue = useCallback(() => {
    pendingPixelsRef.current.clear();
    setQueue(new Set());
  }, []);

  const flushQueue = useCallback(async () => {
    const token = localStorage.getItem('bitplace_session_token');
    if (!token) {
      toast.error('Sign in to save your artwork');
      setIsSpacePainting(false);
      pendingPixelsRef.current.clear();
      setQueue(new Set());
      return;
    }
    
    // Check if already flushing
    if (flushingRef.current) {
      return;
    }
    
    // CRITICAL: Read from ref (synchronous, not subject to React batching)
    const pendingMap = pendingPixelsRef.current;
    if (pendingMap.size === 0) {
      return;
    }
    
    // Atomically capture and clear
    const pixelsToCommit = Array.from(pendingMap.keys()).map(key => {
      const [x, y] = key.split(':').map(Number);
      return { x, y };
    });
    const color = currentColorRef.current;
    
    // Clear pending ref immediately
    pendingPixelsRef.current = new Map();
    setQueue(new Set());
    
    flushingRef.current = true;
    setIsFlushing(true);
    
    try {
      console.log('[usePaintQueue] Flushing', pixelsToCommit.length, 'pixels');
      
      const validateResult = await validate({ mode: 'PAINT', pixels: pixelsToCommit, color });
      
      if (!validateResult?.ok) {
        console.warn('[usePaintQueue] Validation failed:', validateResult);
        setIsSpacePainting(false);
        return;
      }
      
      console.log('[usePaintQueue] Validation passed, committing...');
      
      const commitResult = await commit({
        mode: 'PAINT',
        pixels: pixelsToCommit,
        color,
        snapshotHash: validateResult.snapshotHash,
      });
      
      if (commitResult) {
        console.log('[usePaintQueue] Commit successful:', commitResult);
        const now = Date.now();
        pixelsToCommit.forEach(({ x, y }) => {
          confirmPixel(x, y);
          recentlyCommittedRef.current.set(`${x}:${y}`, now);
        });
        
        if (commitResult.peStatus) {
          updatePeStatus(commitResult.peStatus);
        }
        refreshUser();
        soundEngine.play('paint_commit');
      } else {
        console.warn('[usePaintQueue] Commit returned null');
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
