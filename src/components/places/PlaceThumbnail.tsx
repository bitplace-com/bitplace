import { useEffect, useRef, useState, memo } from "react";
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
  width?: number;
  height?: number;
  className?: string;
}

interface PixelData {
  x: number;
  y: number;
  color: string;
}

// Cache for pixel data to avoid refetching
const pixelCache = new Map<string, PixelData[]>();

function getBboxKey(bbox: PlaceThumbnailProps["bbox"]): string | null {
  if (!bbox || bbox.xmin == null || bbox.ymin == null || bbox.xmax == null || bbox.ymax == null) {
    return null;
  }
  return `${bbox.xmin}-${bbox.ymin}-${bbox.xmax}-${bbox.ymax}`;
}

export const PlaceThumbnail = memo(function PlaceThumbnail({
  bbox,
  width = 80,
  height = 80,
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

  // Fetch and render pixels
  useEffect(() => {
    if (!isVisible) return;

    const bboxKey = getBboxKey(bbox);
    if (!bboxKey || !bbox || bbox.xmin == null || bbox.ymin == null || bbox.xmax == null || bbox.ymax == null) {
      setIsLoading(false);
      setHasPixels(false);
      return;
    }

    const fetchAndRender = async () => {
      setIsLoading(true);

      try {
        // Check cache first
        let pixels = pixelCache.get(bboxKey);

        if (!pixels) {
          // Calculate downsample factor for large areas
          const bboxWidth = bbox.xmax - bbox.xmin + 1;
          const bboxHeight = bbox.ymax - bbox.ymin + 1;
          const maxPixels = 100;
          
          // Fetch pixels within bbox (limit to maxPixels)
          const { data, error } = await supabase
            .from("pixels")
            .select("x, y, color")
            .gte("x", bbox.xmin)
            .lte("x", bbox.xmax)
            .gte("y", bbox.ymin)
            .lte("y", bbox.ymax)
            .limit(maxPixels);

          if (error) {
            console.error("Failed to fetch thumbnail pixels:", error);
            setHasPixels(false);
            setIsLoading(false);
            return;
          }

          pixels = data || [];
          
          // Cache the result
          if (pixels.length > 0) {
            pixelCache.set(bboxKey, pixels);
          }
        }

        if (pixels.length === 0) {
          setHasPixels(false);
          setIsLoading(false);
          return;
        }

        // Render to canvas
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Clear canvas
        ctx.fillStyle = "hsl(var(--muted))";
        ctx.fillRect(0, 0, width, height);

        // Calculate scaling
        const bboxWidth = bbox.xmax - bbox.xmin + 1;
        const bboxHeight = bbox.ymax - bbox.ymin + 1;
        
        // Calculate cell size to fit all pixels
        const cellWidth = width / bboxWidth;
        const cellHeight = height / bboxHeight;
        const cellSize = Math.max(1, Math.min(cellWidth, cellHeight));

        // Center the drawing
        const offsetX = (width - bboxWidth * cellSize) / 2;
        const offsetY = (height - bboxHeight * cellSize) / 2;

        // Draw each pixel
        pixels.forEach((pixel) => {
          ctx.fillStyle = pixel.color;
          const px = (pixel.x - bbox.xmin) * cellSize + offsetX;
          const py = (pixel.y - bbox.ymin) * cellSize + offsetY;
          ctx.fillRect(px, py, Math.ceil(cellSize), Math.ceil(cellSize));
        });

        setHasPixels(true);
      } catch (e) {
        console.error("Thumbnail render error:", e);
        setHasPixels(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAndRender();
  }, [isVisible, bbox, width, height]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden rounded-lg bg-muted/50",
        className
      )}
      style={{ width, height }}
    >
      {isLoading ? (
        <Skeleton className="absolute inset-0" />
      ) : !hasPixels ? (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/40">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            className="opacity-40"
          >
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
      ) : (
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="absolute inset-0"
        />
      )}
    </div>
  );
});
