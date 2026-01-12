import { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { PixelIcon } from '@/components/icons/PixelIcon';
import { Skeleton } from '@/components/ui/skeleton';

interface PixelData {
  x: number;
  y: number;
  color: string;
}

interface OwnerArtworkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  ownerName: string | null;
  onJumpToPixel: (x: number, y: number) => void;
}

export function OwnerArtworkModal({
  open,
  onOpenChange,
  userId,
  ownerName,
  onJumpToPixel,
}: OwnerArtworkModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pixels, setPixels] = useState<PixelData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hoveredPixel, setHoveredPixel] = useState<PixelData | null>(null);
  const [canvasParams, setCanvasParams] = useState<{
    minX: number;
    minY: number;
    pixelSize: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  // Fetch pixels when modal opens
  useEffect(() => {
    if (!open || !userId) {
      setPixels([]);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const fetchPixels = async () => {
      try {
        const { data, error } = await supabase
          .from('pixels')
          .select('x, y, color')
          .eq('owner_user_id', userId)
          .limit(5000);

        if (error) {
          console.error('[OwnerArtworkModal] Error:', error);
          return;
        }

        if (isMounted && data) {
          setPixels(data as PixelData[]);
        }
      } catch (err) {
        console.error('[OwnerArtworkModal] Error:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchPixels();
    return () => { isMounted = false; };
  }, [open, userId]);

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

    // Clear with background
    ctx.fillStyle = 'hsl(var(--muted))';
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    // Calculate bounds
    const xs = pixels.map(p => p.x);
    const ys = pixels.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const rangeX = maxX - minX + 1;
    const rangeY = maxY - minY + 1;

    const padding = 16;
    const availableWidth = displayWidth - padding * 2;
    const availableHeight = displayHeight - padding * 2;

    const pixelSize = Math.max(2, Math.min(
      availableWidth / rangeX,
      availableHeight / rangeY,
      12
    ));

    const drawWidth = rangeX * pixelSize;
    const drawHeight = rangeY * pixelSize;
    const offsetX = (displayWidth - drawWidth) / 2;
    const offsetY = (displayHeight - drawHeight) / 2;

    // Store params for click detection
    setCanvasParams({ minX, minY, pixelSize, offsetX, offsetY });

    // Draw pixels
    pixels.forEach(pixel => {
      const x = offsetX + (pixel.x - minX) * pixelSize;
      const y = offsetY + (pixel.y - minY) * pixelSize;

      ctx.fillStyle = pixel.color || '#888888';
      ctx.fillRect(x, y, pixelSize - 0.5, pixelSize - 0.5);
    });
  }, [pixels]);

  // Handle canvas click
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasParams || pixels.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const { minX, minY, pixelSize, offsetX, offsetY } = canvasParams;

    // Convert click to pixel coordinates
    const gridX = Math.floor((clickX - offsetX) / pixelSize) + minX;
    const gridY = Math.floor((clickY - offsetY) / pixelSize) + minY;

    // Find if there's a pixel at this location
    const clickedPixel = pixels.find(p => p.x === gridX && p.y === gridY);

    if (clickedPixel) {
      onJumpToPixel(clickedPixel.x, clickedPixel.y);
      onOpenChange(false);
    }
  }, [canvasParams, pixels, onJumpToPixel, onOpenChange]);

  // Handle canvas hover
  const handleCanvasHover = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasParams || pixels.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const hoverX = e.clientX - rect.left;
    const hoverY = e.clientY - rect.top;

    const { minX, minY, pixelSize, offsetX, offsetY } = canvasParams;

    const gridX = Math.floor((hoverX - offsetX) / pixelSize) + minX;
    const gridY = Math.floor((hoverY - offsetY) / pixelSize) + minY;

    const pixel = pixels.find(p => p.x === gridX && p.y === gridY);
    setHoveredPixel(pixel || null);
  }, [canvasParams, pixels]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PixelIcon name="brush" className="w-4 h-4" />
            {ownerName ? `${ownerName}'s Artwork` : "Owner's Artwork"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {isLoading ? (
            <Skeleton className="w-full h-64 rounded-lg" />
          ) : pixels.length === 0 ? (
            <div className="w-full h-64 rounded-lg bg-muted flex items-center justify-center">
              <p className="text-sm text-muted-foreground">No pixels owned</p>
            </div>
          ) : (
            <>
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  className="w-full h-64 rounded-lg cursor-pointer"
                  style={{ imageRendering: 'pixelated' }}
                  onClick={handleCanvasClick}
                  onMouseMove={handleCanvasHover}
                  onMouseLeave={() => setHoveredPixel(null)}
                />
                {hoveredPixel && (
                  <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-popover/90 border border-border text-xs font-mono">
                    ({hoveredPixel.x.toLocaleString()}, {hoveredPixel.y.toLocaleString()})
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{pixels.length.toLocaleString()} pixels owned</span>
                <span>Click to jump to location</span>
              </div>
            </>
          )}

          <div className="flex justify-end pt-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
