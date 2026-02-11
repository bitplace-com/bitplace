import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { PixelIcon } from "@/components/icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Place } from "@/hooks/usePlaces";
import { getCountryByCode } from "@/lib/countries";
import { getAvatarInitial } from "@/lib/avatar";
import { PlaceThumbnail } from "./PlaceThumbnail";

interface PlaceCardProps {
  place: Place;
  onNavigate?: (place: Place) => void;
  onToggleLike?: (placeId: string) => void;
  onToggleSave?: (placeId: string) => void;
  isAuthenticated?: boolean;
  className?: string;
}

export function PlaceCard({
  place,
  onNavigate,
  onToggleLike,
  onToggleSave,
  isAuthenticated = false,
  className,
}: PlaceCardProps) {
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

  return (
    <div
      className={cn(
        "group relative rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-3",
        "hover:border-primary/30 hover:bg-card/80 transition-all duration-200",
        "cursor-pointer",
        className
      )}
      onClick={handleNavigate}
    >
      <div className="flex gap-3">
        {/* Thumbnail */}
        <PlaceThumbnail
          bbox={hasBbox ? {
            xmin: place.bbox_xmin!,
            ymin: place.bbox_ymin!,
            xmax: place.bbox_xmax!,
            ymax: place.bbox_ymax!,
          } : null}
          width={72}
          height={72}
          className="shrink-0"
        />

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Creator row */}
          <div className="flex items-center gap-1.5 mb-1">
            <Avatar className="h-5 w-5">
              <AvatarImage src={creator?.avatar_url || undefined} />
              <AvatarFallback className="text-[10px] bg-muted">
                {getAvatarInitial(creator?.display_name, null)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs font-medium truncate max-w-20">
              {creator?.display_name || "Anon"}
            </span>
            {country && <span className="text-xs">{country.flag}</span>}
            <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
              {formatDistanceToNow(new Date(place.created_at), { addSuffix: false })}
            </span>
          </div>

          {/* Title */}
          <h3 className="font-semibold text-sm text-foreground line-clamp-1">
            {place.title}
          </h3>

          {/* Description */}
          {place.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
              {place.description}
            </p>
          )}

          {/* Footer: Stats & Actions */}
          <div className="flex items-center gap-2 mt-auto pt-1.5">
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
                name="pin" 
                size="sm"
                className={place.savedByMe ? "fill-current" : ""}
              />
            </button>

            {/* Trending score badge */}
            {place.stats.trending_score != null && place.stats.trending_score > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-amber-500 font-medium">
                <PixelIcon name="bolt" size="xs" />
                {place.stats.trending_score}
              </span>
            )}

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
              <PixelIcon name="navigation" size="sm" className="mr-1" />
              Go
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
