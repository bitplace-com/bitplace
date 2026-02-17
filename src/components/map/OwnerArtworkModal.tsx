import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { PixelIcon } from '@/components/icons/PixelIcon';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { gridIntToLngLat } from '@/lib/pixelGrid';
import { sharePixel, shareArtwork } from '@/lib/shareLink';
import { toast } from 'sonner';

interface PixelData {
  x: number;
  y: number;
  color: string;
}

interface Cluster {
  pixels: PixelData[];
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  centerX: number;
  centerY: number;
}

interface OwnerArtworkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  ownerName: string | null;
  onJumpToPixel: (x: number, y: number) => void;
}

/** Union-Find for clustering nearby pixels */
function clusterPixels(pixels: PixelData[], gap = 3): Cluster[] {
  if (pixels.length === 0) return [];

  const keyMap = new Map<string, number>();
  pixels.forEach((p, i) => keyMap.set(`${p.x}:${p.y}`, i));

  const parent = pixels.map((_, i) => i);
  const rank = new Array(pixels.length).fill(0);

  function find(a: number): number {
    while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; }
    return a;
  }
  function union(a: number, b: number) {
    const ra = find(a), rb = find(b);
    if (ra === rb) return;
    if (rank[ra] < rank[rb]) parent[ra] = rb;
    else if (rank[ra] > rank[rb]) parent[rb] = ra;
    else { parent[rb] = ra; rank[ra]++; }
  }

  // Connect pixels within gap distance
  for (let i = 0; i < pixels.length; i++) {
    const p = pixels[i];
    for (let dx = -gap; dx <= gap; dx++) {
      for (let dy = -gap; dy <= gap; dy++) {
        if (dx === 0 && dy === 0) continue;
        const neighbor = keyMap.get(`${p.x + dx}:${p.y + dy}`);
        if (neighbor !== undefined) union(i, neighbor);
      }
    }
  }

  const groups = new Map<number, PixelData[]>();
  pixels.forEach((p, i) => {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(p);
  });

  return Array.from(groups.values())
    .map(pxs => {
      const xs = pxs.map(p => p.x);
      const ys = pxs.map(p => p.y);
      const minX = Math.min(...xs), maxX = Math.max(...xs);
      const minY = Math.min(...ys), maxY = Math.max(...ys);
      return {
        pixels: pxs,
        minX, maxX, minY, maxY,
        centerX: Math.round((minX + maxX) / 2),
        centerY: Math.round((minY + maxY) / 2),
      };
    })
    .sort((a, b) => b.pixels.length - a.pixels.length);
}

/** Mini canvas that renders a cluster */
function ClusterCanvas({
  cluster,
  onClick,
  size = 120,
}: {
  cluster: Cluster;
  onClick: () => void;
  size?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = 'hsl(var(--muted))';
    ctx.fillRect(0, 0, size, size);

    const { minX, maxX, minY, maxY, pixels } = cluster;
    const rangeX = maxX - minX + 1;
    const rangeY = maxY - minY + 1;
    const padding = 4;
    const available = size - padding * 2;
    const pixelSize = Math.max(1, Math.min(available / rangeX, available / rangeY, 10));
    const drawW = rangeX * pixelSize;
    const drawH = rangeY * pixelSize;
    const offX = (size - drawW) / 2;
    const offY = (size - drawH) / 2;

    pixels.forEach(p => {
      ctx.fillStyle = p.color || '#888888';
      ctx.fillRect(
        offX + (p.x - minX) * pixelSize,
        offY + (p.y - minY) * pixelSize,
        pixelSize - 0.3,
        pixelSize - 0.3,
      );
    });
  }, [cluster, size]);

  return (
    <canvas
      ref={canvasRef}
      className="rounded-lg cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
      style={{ width: size, height: size, imageRendering: 'pixelated' }}
      onClick={onClick}
    />
  );
}

export function OwnerArtworkModal({
  open,
  onOpenChange,
  userId,
  ownerName,
  onJumpToPixel,
}: OwnerArtworkModalProps) {
  const [pixels, setPixels] = useState<PixelData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open || !userId) { setPixels([]); return; }
    let mounted = true;
    setIsLoading(true);

    (async () => {
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
            console.error('[OwnerArtworkModal]', error);
            break;
          }
          if (data) allPixels = allPixels.concat(data as PixelData[]);
          hasMore = (data?.length || 0) === PAGE_SIZE;
          offset += PAGE_SIZE;
        }
        if (mounted) setPixels(allPixels);
      } catch (err) {
        console.error('[OwnerArtworkModal]', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [open, userId]);

  const clusters = useMemo(() => clusterPixels(pixels, 5), [pixels]);

  const handleClusterClick = useCallback((cluster: Cluster) => {
    const { lng, lat } = gridIntToLngLat(cluster.centerX, cluster.centerY);
    window.dispatchEvent(new CustomEvent('bitplace:navigate', {
      detail: { lat, lng, zoom: 18, pixelX: cluster.centerX, pixelY: cluster.centerY }
    }));
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PixelIcon name="brush" className="w-4 h-4" />
            {ownerName ? `${ownerName}'s Paints` : "Owner's Paints"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {isLoading ? (
            <Skeleton className="w-full h-64 rounded-lg" />
          ) : pixels.length === 0 ? (
            <div className="w-full h-64 rounded-lg bg-muted flex items-center justify-center">
              <p className="text-sm text-muted-foreground">No pixels owned</p>
            </div>
          ) : clusters.length === 1 ? (
            /* Single cluster — show full-size */
            <>
              <div className="flex justify-center">
                <ClusterCanvas
                  cluster={clusters[0]}
                  onClick={() => handleClusterClick(clusters[0])}
                  size={280}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{pixels.length.toLocaleString()} pixels</span>
                <button
                  onClick={() => sharePixel(clusters[0].centerX, clusters[0].centerY).then(ok => ok && toast.success('Link copied!'))}
                  className="flex items-center gap-0.5 hover:text-foreground transition-colors"
                >
                  <PixelIcon name="share" className="w-3 h-3" />
                  Share
                </button>
              </div>
            </>
          ) : (
            /* Multiple clusters — grid */
            <>
              <p className="text-xs text-muted-foreground">
                {pixels.length.toLocaleString()} pixels in {clusters.length} areas — click any to jump there
              </p>
              <ScrollArea className="h-72">
                <div className="grid grid-cols-2 gap-2 pr-2">
                  {clusters.map((cluster, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <ClusterCanvas
                        cluster={cluster}
                        onClick={() => handleClusterClick(cluster)}
                        size={160}
                      />
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>{cluster.pixels.length.toLocaleString()} px</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); sharePixel(cluster.centerX, cluster.centerY).then(ok => ok && toast.success('Link copied!')); }}
                          className="hover:text-foreground transition-colors"
                        >
                          <PixelIcon name="share" className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}

          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => shareArtwork(userId, ownerName).then(ok => ok && toast.success('Link copied!'))}
            >
              <PixelIcon name="share" className="w-3.5 h-3.5 mr-1.5" />
              Share All Paints
            </Button>
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
