import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { PixelIcon } from "@/components/icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LevelPill } from "@/components/ui/level-pill";
import { Place } from "@/hooks/usePlaces";
import { getCountryByCode } from "@/lib/countries";
import { getAvatarInitial } from "@/lib/avatar";

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
        "group relative rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-4",
        "hover:border-primary/30 hover:bg-card/80 transition-all duration-200",
        "cursor-pointer",
        className
      )}
      onClick={handleNavigate}
    >
      {/* Header: Creator info */}
      <div className="flex items-center gap-2 mb-3">
      <Avatar className="h-8 w-8">
        <AvatarImage src={creator?.avatar_url || undefined} />
        <AvatarFallback className="text-xs bg-muted">
          {getAvatarInitial(creator?.display_name, null)}
        </AvatarFallback>
      </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-sm truncate">
              {creator?.display_name || "Anonymous"}
            </span>
            <LevelPill level={creator?.level ?? 1} size="xs" />
            {country && <span className="text-sm">{country.flag}</span>}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(place.created_at), { addSuffix: true })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mb-3">
        <h3 className="font-semibold text-foreground line-clamp-1">{place.title}</h3>
        {place.description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {place.description}
          </p>
        )}
      </div>

      {/* Stats & Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {/* Likes */}
          <button
            onClick={handleLike}
            className={cn(
              "flex items-center gap-1 transition-colors",
              place.likedByMe 
                ? "text-red-500" 
                : "hover:text-red-500",
              !isAuthenticated && "opacity-50 cursor-not-allowed"
            )}
            disabled={!isAuthenticated}
          >
            <PixelIcon 
              name="heart" 
              size="sm" 
              className={place.likedByMe ? "fill-current" : ""} 
            />
            <span>{place.stats.likes_all_time}</span>
          </button>

          {/* Save */}
          <button
            onClick={handleSave}
            className={cn(
              "flex items-center gap-1 transition-colors",
              place.savedByMe 
                ? "text-primary" 
                : "hover:text-primary",
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
            <span className="flex items-center gap-1 text-xs text-amber-500">
              <PixelIcon name="bolt" size="xs" />
              {place.stats.trending_score}
            </span>
          )}
        </div>

        {/* Navigate button */}
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-3 text-xs"
          onClick={handleNavigate}
        >
          <PixelIcon name="navigation" size="sm" className="mr-1" />
          Go
        </Button>
      </div>
    </div>
  );
}
