import { useState, useCallback, useRef } from 'react';
import { getAuthHeadersOrExpire } from '@/lib/authHelpers';
import { toast } from 'sonner';
import type { QuantizedPixel } from '@/lib/paletteQuantizer';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Admin chunk size (5000 pixels per batch for speed)
const CHUNK_SIZE = 5000;

export interface AutoPaintProgress {
  phase: 'validate' | 'commit' | 'done' | 'error';
  currentBatch: number;
  totalBatches: number;
  pixelsProcessed: number;
  pixelsTotal: number;
  error?: string;
}

async function invokeEdgeFunction<T>(
  functionName: string,
  body: object,
  headers: Record<string, string>,
): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
      'apikey': ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  
  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data.message || data.error || `Request failed: ${response.status}`);
  }
  return data as T;
}

export function useAutoPaint() {
  const [progress, setProgress] = useState<AutoPaintProgress | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const cancelledRef = useRef(false);

  const startAutoPaint = useCallback(async (
    quantizedPixels: QuantizedPixel[],
    positionX: number,
    positionY: number,
  ) => {
    if (isRunning) return;
    
    const headers = getAuthHeadersOrExpire();
    if (!headers) {
      toast.error('Session expired. Please reconnect.');
      return;
    }

    cancelledRef.current = false;
    setIsRunning(true);

    // Build absolute pixel coordinates with per-pixel color
    const allPixels = quantizedPixels.map(p => ({
      x: positionX + p.dx,
      y: positionY + p.dy,
      color: p.hexColor,
    }));

    const totalPixels = allPixels.length;
    const totalBatches = Math.ceil(totalPixels / CHUNK_SIZE);

    setProgress({
      phase: 'validate',
      currentBatch: 0,
      totalBatches,
      pixelsProcessed: 0,
      pixelsTotal: totalPixels,
    });

    try {
      for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
        if (cancelledRef.current) {
          toast.info('Auto-paint cancelled');
          break;
        }

        const batchPixels = allPixels.slice(batchIdx * CHUNK_SIZE, (batchIdx + 1) * CHUNK_SIZE);
        
        // Use the first pixel's color as the "color" param (required by backend)
        // Per-pixel colors are sent in the pixels array
        const batchColor = batchPixels[0].color;

        // Phase 1: Validate
        setProgress({
          phase: 'validate',
          currentBatch: batchIdx + 1,
          totalBatches,
          pixelsProcessed: batchIdx * CHUNK_SIZE,
          pixelsTotal: totalPixels,
        });

        const validateResult = await invokeEdgeFunction<{
          ok: boolean;
          snapshotHash: string;
          error?: string;
          message?: string;
        }>('game-validate', {
          mode: 'PAINT',
          pixels: batchPixels,
          color: batchColor,
          stream: false,
        }, headers);

        if (!validateResult.ok) {
          throw new Error(validateResult.message || 'Validation failed');
        }

        if (cancelledRef.current) break;

        // Phase 2: Commit
        setProgress({
          phase: 'commit',
          currentBatch: batchIdx + 1,
          totalBatches,
          pixelsProcessed: batchIdx * CHUNK_SIZE,
          pixelsTotal: totalPixels,
        });

        const commitResult = await invokeEdgeFunction<{
          ok: boolean;
          affectedPixels?: number;
          error?: string;
          message?: string;
        }>('game-commit', {
          mode: 'PAINT',
          pixels: batchPixels,
          color: batchColor,
          snapshotHash: validateResult.snapshotHash,
          stream: false,
        }, headers);

        if (!commitResult.ok) {
          throw new Error(commitResult.message || 'Commit failed');
        }

        // Update progress
        const processed = Math.min((batchIdx + 1) * CHUNK_SIZE, totalPixels);
        setProgress({
          phase: batchIdx + 1 >= totalBatches ? 'done' : 'validate',
          currentBatch: batchIdx + 1,
          totalBatches,
          pixelsProcessed: processed,
          pixelsTotal: totalPixels,
        });
      }

      if (!cancelledRef.current) {
        setProgress(prev => prev ? { ...prev, phase: 'done' } : null);
        toast.success(`Auto-paint complete! ${totalPixels.toLocaleString()} pixels painted.`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[useAutoPaint] Error:', msg);
      setProgress(prev => prev ? { ...prev, phase: 'error', error: msg } : null);
      toast.error(`Auto-paint failed: ${msg}`);
    } finally {
      setIsRunning(false);
    }
  }, [isRunning]);

  const cancelAutoPaint = useCallback(() => {
    cancelledRef.current = true;
  }, []);

  const resetProgress = useCallback(() => {
    setProgress(null);
  }, []);

  return {
    startAutoPaint,
    cancelAutoPaint,
    resetProgress,
    progress,
    isRunning,
  };
}
