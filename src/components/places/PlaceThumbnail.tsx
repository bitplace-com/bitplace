import { useEffect, useRef, useState, memo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface PlaceThumbnailProps {
  bbox: {
    xmin: number | null;
    ymin: number | null;
    xmax: number | null;
    ymax: number | null;
  } | null;
  snapshotUrl?: string | null;
  className?: string;
}

interface PixelData {
  x: number;
  y: number;
  color: string;
}

// Cache for pixel data
const pixelCache = new Map<string, PixelData[]>();

function getBboxKey(bbox: PlaceThumbnailProps["bbox"]): string | null {
  if (!bbox || bbox.xmin == null || bbox.ymin == null || bbox.xmax == null || bbox.ymax == null) {
    return null;
  }
  return `${bbox.xmin}-${bbox.ymin}-${bbox.xmax}-${bbox.ymax}`;
}

async function fetchPixels(bbox: { xmin: number; ymin: number; xmax: number; ymax: number }, bboxKey: string): Promise<PixelData[]> {
  const cached = pixelCache.get(bboxKey);
  if (cached) return cached;

  const PAGE = 1000;
  const allPixels: PixelData[] = [];
  let offset = 0;
  let hasMore = true;
  while (hasMore) {
    const { data, error } = await supabase
      .from("pixels")
      .select("x, y, color")
      .gte("x", bbox.xmin)
      .lte("x", bbox.xmax)
      .gte("y", bbox.ymin)
      .lte("y", bbox.ymax)
      .range(offset, offset + PAGE - 1);

    if (error) {
      console.error("Failed to fetch thumbnail pixels:", error);
      return [];
    }

    allPixels.push(...((data as PixelData[]) || []));
    hasMore = (data?.length || 0) === PAGE;
    offset += PAGE;
  }

  if (allPixels.length > 0) {
    pixelCache.set(bboxKey, allPixels);
  }
  return allPixels;
}

export const PlaceThumbnail = memo(function PlaceThumbnail({
  bbox,
  snapshotUrl,
  className,
}: PlaceThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [hasPixels, setHasPixels] = useState(true);

  // Intersection observer for lazy loading
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "100px" }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const render = useCallback(async () => {
    const bboxKey = getBboxKey(bbox);
    if (!bboxKey || !bbox || bbox.xmin == null || bbox.ymin == null || bbox.xmax == null || bbox.ymax == null) {
      setIsLoading(false);
      setHasPixels(false);
      return;
    }

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    setIsLoading(true);

    try {
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      if (cw === 0 || ch === 0) return;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = cw * dpr;
      canvas.height = ch * dpr;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(dpr, dpr);

      const bw = bbox.xmax - bbox.xmin + 1;
      const bh = bbox.ymax - bbox.ymin + 1;
      const padX = Math.max(2, Math.round(bw * 0.2));
      const padY = Math.max(2, Math.round(bh * 0.2));
      const viewXmin = bbox.xmin - padX;
      const viewYmin = bbox.ymin - padY;
      const viewXmax = bbox.xmax + padX;
      const viewYmax = bbox.ymax + padY;
      const viewW = viewXmax - viewXmin + 1;
      const viewH = viewYmax - viewYmin + 1;

      const scale = Math.min(cw / viewW, ch / viewH);
      const drawW = viewW * scale;
      const drawH = viewH * scale;
      const offsetX = (cw - drawW) / 2;
      const offsetY = (ch - drawH) / 2;

      // Fetch pixels first (before any branching)
      const pixels = await fetchPixels(
        { xmin: bbox.xmin, ymin: bbox.ymin, xmax: bbox.xmax, ymax: bbox.ymax },
        bboxKey
      );

      const drawPixels = () => {
        const cellSize = scale;
        pixels.forEach((pixel) => {
          ctx.fillStyle = pixel.color;
          const px = offsetX + (pixel.x - viewXmin) * scale;
          const py = offsetY + (pixel.y - viewYmin) * scale;
          ctx.fillRect(px, py, Math.max(cellSize, 1), Math.max(cellSize, 1));
        });
      };

      if (snapshotUrl) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          ctx.drawImage(img, 0, 0, cw, ch);
          ctx.fillStyle = 'rgba(0,0,0,0.15)';
          ctx.fillRect(0, 0, cw, ch);
          drawPixels();
          setHasPixels(true);
          setIsLoading(false);
        };
        img.onerror = () => {
          ctx.fillStyle = "hsl(var(--muted))";
          ctx.fillRect(0, 0, cw, ch);
          drawPixels();
          setHasPixels(pixels.length > 0);
          setIsLoading(false);
        };
        img.src = snapshotUrl;
        return;
      }

      // Solid background fallback
      ctx.fillStyle = "hsl(var(--muted))";
      ctx.fillRect(0, 0, cw, ch);

      if (pixels.length === 0) {
        setHasPixels(false);
        setIsLoading(false);
        return;
      }

      drawPixels();
      setHasPixels(true);
    } catch (e) {
      console.error("Thumbnail render error:", e);
      setHasPixels(false);
    } finally {
      setIsLoading(false);
    }
  }, [bbox, snapshotUrl]);

  useEffect(() => {
    if (!isVisible) return;
    render();
  }, [isVisible, render]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden bg-muted/50",
        className
      )}
    >
      {isLoading && (
        <Skeleton className="absolute inset-0" />
      )}
      {!isLoading && !hasPixels && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/40">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="opacity-40">
            <rect x="4" y="4" width="4" height="4" fill="currentColor" />
            <rect x="10" y="4" width="4" height="4" fill="currentColor" />
            <rect x="16" y="4" width="4" height="4" fill="currentColor" />
            <rect x="4" y="10" width="4" height="4" fill="currentColor" />
            <rect x="10" y="10" width="4" height="4" fill="currentColor" />
            <rect x="16" y="10" width="4" height="4" fill="currentColor" />
            <rect x="4" y="16" width="4" height="4" fill="currentColor" />
            <rect x="10" y="16" width="4" height="4" fill="currentColor" />
            <rect x="16" y="16" width="4" height="4" fill="currentColor" />
          </svg>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className={cn("absolute inset-0 w-full h-full", (!hasPixels && !isLoading) && "hidden")}
        style={{ imageRendering: "pixelated" }}
      />
    </div>
  );
});
