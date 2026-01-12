import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PixelIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

interface CreatePlaceFormProps {
  currentLat: number;
  currentLng: number;
  currentZoom: number;
  onSubmit: (data: { title: string; description?: string; lat: number; lng: number; zoom: number }) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function CreatePlaceForm({
  currentLat,
  currentLng,
  currentZoom,
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
      });
    } catch (err: any) {
      setError(err.message || "Failed to create place");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
          <PixelIcon name="pin" size="sm" />
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
              <PixelIcon name="plus" size="sm" className="mr-2" />
              Create Place
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
