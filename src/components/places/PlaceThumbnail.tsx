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
  className?: string;
}

interface PixelData {
  x: number;
  y: number;
  color: string;
}

// Cache for pixel data
const pixelCache = new Map<string, PixelData[]>();

// Cache for loaded OSM tile images
const tileImageCache = new Map<string, HTMLImageElement>();

/** OSM tile zoom that maps 1:1 with our grid (GRID_SIZE = 512 * 2^12 = 256 * 2^13) */
const OSM_ZOOM = 13;
const OSM_TILE_SIZE = 256;

function getBboxKey(bbox: PlaceThumbnailProps["bbox"]): string | null {
  if (!bbox || bbox.xmin == null || bbox.ymin == null || bbox.xmax == null || bbox.ymax == null) {
    return null;
  }
  return `${bbox.xmin}-${bbox.ymin}-${bbox.xmax}-${bbox.ymax}`;
}

/** Load an OSM tile image, with caching */
function loadTileImage(tx: number, ty: number): Promise<HTMLImageElement> {
  const key = `${tx}:${ty}`;
  const cached = tileImageCache.get(key);
  if (cached) return Promise.resolve(cached);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      tileImageCache.set(key, img);
      resolve(img);
    };
    img.onerror = reject;
    img.src = `https://tile.openstreetmap.org/${OSM_ZOOM}/${tx}/${ty}.png`;
  });
}

export const PlaceThumbnail = memo(function PlaceThumbnail({
  bbox,
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
      // Measure container
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      if (cw === 0 || ch === 0) return;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = cw * dpr;
      canvas.height = ch * dpr;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(dpr, dpr);

      // Bbox in grid coords
      const bw = bbox.xmax - bbox.xmin + 1;
      const bh = bbox.ymax - bbox.ymin + 1;

      // Add padding around bbox (20% each side, min 2px)
      const padX = Math.max(2, Math.round(bw * 0.2));
      const padY = Math.max(2, Math.round(bh * 0.2));
      const viewXmin = bbox.xmin - padX;
      const viewYmin = bbox.ymin - padY;
      const viewXmax = bbox.xmax + padX;
      const viewYmax = bbox.ymax + padY;
      const viewW = viewXmax - viewXmin + 1;
      const viewH = viewYmax - viewYmin + 1;

      // Scale to fit container
      const scale = Math.min(cw / viewW, ch / viewH);
      const drawW = viewW * scale;
      const drawH = viewH * scale;
      const offsetX = (cw - drawW) / 2;
      const offsetY = (ch - drawH) / 2;

      // Clear
      ctx.fillStyle = "hsl(var(--muted))";
      ctx.fillRect(0, 0, cw, ch);

      // --- Draw OSM tiles as background ---
      // Grid coords map 1:1 to OSM zoom-13 pixel coords
      const tileXmin = Math.floor(viewXmin / OSM_TILE_SIZE);
      const tileXmax = Math.floor(viewXmax / OSM_TILE_SIZE);
      const tileYmin = Math.floor(viewYmin / OSM_TILE_SIZE);
      const tileYmax = Math.floor(viewYmax / OSM_TILE_SIZE);

      // Load all needed tiles in parallel
      const tilePromises: Promise<{ tx: number; ty: number; img: HTMLImageElement } | null>[] = [];
      for (let ty = tileYmin; ty <= tileYmax; ty++) {
        for (let tx = tileXmin; tx <= tileXmax; tx++) {
          tilePromises.push(
            loadTileImage(tx, ty)
              .then(img => ({ tx, ty, img }))
              .catch(() => null)
          );
        }
      }

      const tiles = await Promise.all(tilePromises);

      // Draw each tile
      for (const tile of tiles) {
        if (!tile) continue;
        // Tile covers grid pixels [tx*256, (tx+1)*256) x [ty*256, (ty+1)*256)
        const tileGridX = tile.tx * OSM_TILE_SIZE;
        const tileGridY = tile.ty * OSM_TILE_SIZE;

        const sx = offsetX + (tileGridX - viewXmin) * scale;
        const sy = offsetY + (tileGridY - viewYmin) * scale;
        const sw = OSM_TILE_SIZE * scale;
        const sh = OSM_TILE_SIZE * scale;

        ctx.drawImage(tile.img, sx, sy, sw, sh);
      }

      // Semi-transparent overlay to make pixels pop
      ctx.fillStyle = "rgba(0,0,0,0.15)";
      ctx.fillRect(0, 0, cw, ch);

      // --- Fetch and draw pixels ---
      let pixels = pixelCache.get(bboxKey);

      if (!pixels) {
        const { data, error } = await supabase
          .from("pixels")
          .select("x, y, color")
          .gte("x", bbox.xmin)
          .lte("x", bbox.xmax)
          .gte("y", bbox.ymin)
          .lte("y", bbox.ymax)
          .limit(1000);

        if (error) {
          console.error("Failed to fetch thumbnail pixels:", error);
          setHasPixels(false);
          setIsLoading(false);
          return;
        }

        pixels = data || [];
        if (pixels.length > 0) {
          pixelCache.set(bboxKey, pixels);
        }
      }

      if (pixels.length === 0) {
        setHasPixels(false);
        setIsLoading(false);
        return;
      }

      // Draw each pixel
      const cellSize = scale; // 1 grid pixel = `scale` CSS pixels
      pixels.forEach((pixel) => {
        ctx.fillStyle = pixel.color;
        const px = offsetX + (pixel.x - viewXmin) * scale;
        const py = offsetY + (pixel.y - viewYmin) * scale;
        ctx.fillRect(px, py, Math.max(cellSize, 1), Math.max(cellSize, 1));
      });

      setHasPixels(true);
    } catch (e) {
      console.error("Thumbnail render error:", e);
      setHasPixels(false);
    } finally {
      setIsLoading(false);
    }
  }, [bbox]);

  // Fetch and render when visible
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
