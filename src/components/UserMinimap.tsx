import { useRef, useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PixelData {
  x: number;
  y: number;
  color: string;
}

interface UserMinimapProps {
  userId: string | null | undefined;
  height?: string;
  showEmptyState?: boolean;
  className?: string;
}

export function UserMinimap({ 
  userId, 
  height = '8rem', 
  showEmptyState = true,
  className = ''
}: UserMinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pixels, setPixels] = useState<PixelData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch user's pixels
  useEffect(() => {
    if (!userId) {
      setPixels([]);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const fetchPixels = async () => {
      try {
        const PAGE_SIZE = 1000;
        let offset = 0;
        let allPixels: PixelData[] = [];
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase
            .from('pixels')
            .select('x, y, color')
            .eq('owner_user_id', userId)
            .range(offset, offset + PAGE_SIZE - 1);

          if (error) {
            console.error('[UserMinimap] Error fetching pixels:', error);
            return;
          }

          if (data) {
            allPixels = allPixels.concat(data as PixelData[]);
          }
          hasMore = (data?.length || 0) === PAGE_SIZE;
          offset += PAGE_SIZE;
        }

        if (isMounted) {
          setPixels(allPixels);
        }
      } catch (err) {
        console.error('[UserMinimap] Error:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchPixels();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  // Draw pixels on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || pixels.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
    
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas with muted background
    ctx.fillStyle = 'hsl(var(--muted))';
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    if (pixels.length === 0) return;

    // Calculate bounds
    const xs = pixels.map(p => p.x);
    const ys = pixels.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const rangeX = maxX - minX + 1;
    const rangeY = maxY - minY + 1;
    
    // Add padding
    const padding = 10;
    const availableWidth = displayWidth - padding * 2;
    const availableHeight = displayHeight - padding * 2;
    
    // Calculate pixel size to fit all pixels
    const pixelSize = Math.max(2, Math.min(
      availableWidth / rangeX,
      availableHeight / rangeY,
      8 // Max pixel size
    ));

    // Center the drawing
    const drawWidth = rangeX * pixelSize;
    const drawHeight = rangeY * pixelSize;
    const offsetX = (displayWidth - drawWidth) / 2;
    const offsetY = (displayHeight - drawHeight) / 2;

    // Draw pixels
    pixels.forEach(pixel => {
      const x = offsetX + (pixel.x - minX) * pixelSize;
      const y = offsetY + (pixel.y - minY) * pixelSize;
      
      ctx.fillStyle = pixel.color || '#888888';
      ctx.fillRect(x, y, pixelSize - 0.5, pixelSize - 0.5);
    });
  }, [pixels]);

  if (isLoading) {
    return (
      <div 
        className={`w-full rounded-lg bg-muted animate-pulse ${className}`}
        style={{ height }}
      />
    );
  }

  if (pixels.length === 0) {
    if (!showEmptyState) return null;
    
    return (
      <div 
        className={`w-full rounded-lg bg-muted flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <p className="text-sm text-muted-foreground">No pixels owned yet</p>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={`w-full rounded-lg ${className}`}
      style={{ height, imageRendering: 'pixelated' }}
    />
  );
}
