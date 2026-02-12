import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PixelIcon } from "@/components/icons";

interface PixelData {
  x: number;
  y: number;
  color: string;
}

interface CreatePlaceFormProps {
  currentLat: number;
  currentLng: number;
  currentZoom: number;
  bbox?: { xmin: number; ymin: number; xmax: number; ymax: number };
  artworkPixels?: PixelData[];
  mapSnapshot?: string;
  onSubmit: (data: { 
    title: string; description?: string; lat: number; lng: number; zoom: number;
    bbox?: { xmin: number; ymin: number; xmax: number; ymax: number };
  }) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

/** Inline canvas preview of artwork pixels with map snapshot background */
function ArtworkPreview({ pixels, bbox, mapSnapshot }: { pixels: PixelData[]; bbox: { xmin: number; ymin: number; xmax: number; ymax: number }; mapSnapshot?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || pixels.length === 0) return;

    const cw = container.clientWidth;
    const ch = container.clientHeight;
    if (cw === 0 || ch === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = cw * dpr;
    canvas.height = ch * dpr;
    ctx.scale(dpr, dpr);

    const bw = bbox.xmax - bbox.xmin + 1;
    const bh = bbox.ymax - bbox.ymin + 1;
    const padX = Math.max(2, Math.round(bw * 0.2));
    const padY = Math.max(2, Math.round(bh * 0.2));
    const vxmin = bbox.xmin - padX;
    const vymin = bbox.ymin - padY;
    const vxmax = bbox.xmax + padX;
    const vymax = bbox.ymax + padY;
    const vw = vxmax - vxmin + 1;
    const vh = vymax - vymin + 1;

    const scale = Math.min(cw / vw, ch / vh);
    const drawW = vw * scale;
    const drawH = vh * scale;
    const offX = (cw - drawW) / 2;
    const offY = (ch - drawH) / 2;

    // Background
    ctx.fillStyle = "hsl(var(--muted))";
    ctx.fillRect(0, 0, cw, ch);

    const drawPixels = () => {
      // Semi-transparent overlay
      ctx.fillStyle = "rgba(0,0,0,0.15)";
      ctx.fillRect(0, 0, cw, ch);

      // Draw pixels
      pixels.forEach((p) => {
        ctx.fillStyle = p.color || "#888888";
        const px = offX + (p.x - vxmin) * scale;
        const py = offY + (p.y - vymin) * scale;
        ctx.fillRect(px, py, Math.max(scale, 1), Math.max(scale, 1));
      });
    };

    if (mapSnapshot) {
      // Use map snapshot as background
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, cw, ch);
        drawPixels();
      };
      img.onerror = () => {
        // Fallback to solid background
        drawPixels();
      };
      img.src = mapSnapshot;
    } else {
      drawPixels();
    }
  }, [pixels, bbox, mapSnapshot]);

  return (
    <div className="flex justify-center">
      <div ref={containerRef} className="w-full h-64 relative rounded-lg border border-border/50 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ imageRendering: "pixelated" }}
        />
      </div>
    </div>
  );
}

export function CreatePlaceForm({
  currentLat,
  currentLng,
  currentZoom,
  bbox,
  artworkPixels,
  mapSnapshot,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: CreatePlaceFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    if (title.length > 100) {
      setError("Title must be 100 characters or less");
      return;
    }

    if (description.length > 500) {
      setError("Description must be 500 characters or less");
      return;
    }

    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        lat: currentLat,
        lng: currentLng,
        zoom: Math.round(currentZoom),
        bbox,
      });
    } catch (err: any) {
      setError(err.message || "Failed to create place");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Artwork Preview */}
      {artworkPixels && artworkPixels.length > 0 && bbox && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Artwork Preview</Label>
          <ArtworkPreview pixels={artworkPixels} bbox={bbox} mapSnapshot={mapSnapshot} />
          <p className="text-[10px] text-muted-foreground text-center">
            {artworkPixels.length.toLocaleString()} pixels detected
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Name this place..."
          maxLength={100}
          disabled={isSubmitting}
        />
        <div className="text-xs text-muted-foreground text-right">
          {title.length}/100
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What makes this place special?"
          rows={3}
          maxLength={500}
          disabled={isSubmitting}
        />
        <div className="text-xs text-muted-foreground text-right">
          {description.length}/500
        </div>
      </div>

      <div className="rounded-lg bg-muted/50 p-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <PixelIcon name="locationPin" size="sm" />
          <span>Location</span>
        </div>
        <div className="font-mono text-xs">
          {currentLat.toFixed(4)}, {currentLng.toFixed(4)} (zoom {Math.round(currentZoom)})
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || !title.trim()}
          className="flex-1"
        >
          {isSubmitting ? (
            <>
              <PixelIcon name="loader" size="sm" className="mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <PixelIcon name="locationPin" size="sm" className="mr-2" />
              Create Pin
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
