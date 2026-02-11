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
  onSubmit: (data: { 
    title: string; description?: string; lat: number; lng: number; zoom: number;
    bbox?: { xmin: number; ymin: number; xmax: number; ymax: number };
  }) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

/** Inline canvas preview of artwork pixels */
function ArtworkPreview({ pixels, bbox }: { pixels: PixelData[]; bbox: { xmin: number; ymin: number; xmax: number; ymax: number } }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const SIZE = 280;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || pixels.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = "hsl(var(--muted))";
    ctx.fillRect(0, 0, SIZE, SIZE);

    const rangeX = bbox.xmax - bbox.xmin + 1;
    const rangeY = bbox.ymax - bbox.ymin + 1;
    const padding = 8;
    const available = SIZE - padding * 2;
    const pixelSize = Math.max(1, Math.min(available / rangeX, available / rangeY, 10));
    const drawW = rangeX * pixelSize;
    const drawH = rangeY * pixelSize;
    const offX = (SIZE - drawW) / 2;
    const offY = (SIZE - drawH) / 2;

    pixels.forEach((p) => {
      ctx.fillStyle = p.color || "#888888";
      ctx.fillRect(
        offX + (p.x - bbox.xmin) * pixelSize,
        offY + (p.y - bbox.ymin) * pixelSize,
        pixelSize - 0.3,
        pixelSize - 0.3
      );
    });
  }, [pixels, bbox]);

  return (
    <div className="flex justify-center">
      <canvas
        ref={canvasRef}
        className="rounded-lg border border-border/50"
        style={{ width: SIZE, height: SIZE, imageRendering: "pixelated" }}
      />
    </div>
  );
}

export function CreatePlaceForm({
  currentLat,
  currentLng,
  currentZoom,
  bbox,
  artworkPixels,
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
          <ArtworkPreview pixels={artworkPixels} bbox={bbox} />
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
