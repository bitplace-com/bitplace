import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { PixelIcon } from "@/components/icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Place } from "@/hooks/usePlaces";
import { getCountryByCode } from "@/lib/countries";
import { BitplaceLogo } from "@/components/icons/BitplaceLogo";
import { PlaceThumbnail } from "./PlaceThumbnail";
import { PEIcon } from "@/components/ui/pe-icon";
import { PE_PER_USD } from "@/config/energy";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PlaceCardProps {
  place: Place;
  onNavigate?: (place: Place) => void;
  onToggleLike?: (placeId: string) => void;
  onToggleSave?: (placeId: string) => void;
  onDelete?: (placeId: string) => void;
  isOwner?: boolean;
  isAuthenticated?: boolean;
  className?: string;
}

export function PlaceCard({
  place,
  onNavigate,
  onToggleLike,
  onToggleSave,
  onDelete,
  isOwner = false,
  isAuthenticated = false,
  className,
}: PlaceCardProps) {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const creator = place.creator;
  const country = creator?.country_code ? getCountryByCode(creator.country_code) : null;

  const hasBbox = place.bbox_xmin != null && place.bbox_ymin != null && 
                  place.bbox_xmax != null && place.bbox_ymax != null;

  const handleNavigate = () => {
    onNavigate?.(place);
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAuthenticated) {
      onToggleLike?.(place.id);
    }
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAuthenticated) {
      onToggleSave?.(place.id);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    onDelete?.(place.id);
    setDeleteConfirmOpen(false);
  };

  return (
    <>
    <div
      className={cn(
        "group relative rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden",
        "hover:border-primary/30 hover:bg-card/80 transition-all duration-200",
        "cursor-pointer",
        className
      )}
      onClick={handleNavigate}
    >
      {/* Full-width Thumbnail */}
      <PlaceThumbnail
        bbox={hasBbox ? {
          xmin: place.bbox_xmin!,
          ymin: place.bbox_ymin!,
          xmax: place.bbox_xmax!,
          ymax: place.bbox_ymax!,
        } : null}
        snapshotUrl={place.snapshot_url}
        className="w-full h-32 rounded-none"
      />

      {/* Content */}
      <div className="p-3 flex flex-col gap-1">
        {/* Creator row */}
        <div className="flex items-center gap-1.5">
          <Avatar className="h-5 w-5">
            <AvatarImage src={creator?.avatar_url || undefined} />
            <AvatarFallback className="bg-muted flex items-center justify-center">
              <BitplaceLogo className="w-3 h-3 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>
          <span className="text-xs font-medium truncate max-w-20">
            {creator?.display_name || "Anon"}
          </span>
          {country && <span className="text-xs">{country.flag}</span>}
          <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
            {formatDistanceToNow(new Date(place.created_at), { addSuffix: false })} ago
          </span>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-sm text-foreground line-clamp-1">
          {place.title}
        </h3>

        {/* Description */}
        {place.description && (
          <p className="text-xs text-muted-foreground line-clamp-1">
            {place.description}
          </p>
        )}

        {/* Footer: Stats & Actions */}
        <div className="flex items-center gap-2 pt-1">
          {/* Likes */}
          <button
            onClick={handleLike}
            className={cn(
              "flex items-center gap-1 text-xs transition-colors min-w-[44px] min-h-[28px] justify-center rounded-md",
              place.likedByMe 
                ? "text-red-500" 
                : "text-muted-foreground hover:text-red-500",
              !isAuthenticated && "opacity-50 cursor-not-allowed"
            )}
            disabled={!isAuthenticated}
          >
            <PixelIcon 
              name="heart" 
              size="sm" 
              className={place.likedByMe ? "fill-current" : ""} 
            />
            <span className="tabular-nums">{place.stats.likes_all_time}</span>
          </button>

          {/* Save */}
          <button
            onClick={handleSave}
            className={cn(
              "flex items-center gap-1 text-xs transition-colors min-w-[28px] min-h-[28px] justify-center rounded-md",
              place.savedByMe 
                ? "text-primary" 
                : "text-muted-foreground hover:text-primary",
              !isAuthenticated && "opacity-50 cursor-not-allowed"
            )}
            disabled={!isAuthenticated}
          >
            <PixelIcon 
              name="locationPin" 
              size="sm"
              className={place.savedByMe ? "fill-current" : ""}
            />
          </button>

          {/* Delete (owner only) */}
          {isOwner && onDelete && (
            <button
              onClick={handleDelete}
              className="flex items-center text-xs text-muted-foreground hover:text-destructive transition-colors min-w-[28px] min-h-[28px] justify-center rounded-md"
            >
              <PixelIcon name="trash" size="sm" />
            </button>
          )}

          {/* PE Value inline */}
          <div className="flex items-center gap-1">
            <PEIcon size="sm" className="text-foreground/70" />
            <span className="text-xs font-semibold tabular-nums">
              {place.stats.total_pe.toLocaleString()} PE
            </span>
            <span className="text-xs font-medium text-emerald-500">
              ${(place.stats.total_pe / PE_PER_USD).toFixed(2)}
            </span>
          </div>

          {/* Navigate button */}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs ml-auto"
            onClick={(e) => {
              e.stopPropagation();
              handleNavigate();
            }}
          >
            <PixelIcon name="startups" size="sm" className="mr-1" />
            Go
          </Button>
        </div>
      </div>
    </div>
      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimina pin</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare questo pin? Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
