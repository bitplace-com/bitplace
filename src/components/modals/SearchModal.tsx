import { useState, useEffect, useCallback, useRef } from "react";
import { Search, MapPin, Clock, X, Navigation, Loader2 } from "lucide-react";
import { GameModal } from "./GameModal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSearch, type PlaceResult, type RecentSearch } from "@/hooks/useSearch";
import { parseSearchInput, pixelToLngLat, formatCoords, formatPixel } from "@/lib/coordinates";

interface SearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchModal({ open, onOpenChange }: SearchModalProps) {
  const [inputValue, setInputValue] = useState("");
  const [parsedType, setParsedType] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const {
    recentSearches,
    searchResults,
    isSearching,
    searchError,
    searchPlaces,
    addRecentSearch,
    clearRecentSearches,
    clearSearchResults,
  } = useSearch();

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setInputValue("");
      clearSearchResults();
      setParsedType(null);
    }
  }, [open, clearSearchResults]);

  // Parse input and trigger search with debounce
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const parsed = parseSearchInput(inputValue);
    setParsedType(parsed.type === 'invalid' ? null : parsed.type);

    // Only search for places after debounce
    if (parsed.type === 'place' && parsed.query.length >= 2) {
      debounceRef.current = setTimeout(() => {
        searchPlaces(parsed.query);
      }, 500);
    } else {
      clearSearchResults();
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [inputValue, searchPlaces, clearSearchResults]);

  // Navigate to coordinates and dispatch event
  const navigateTo = useCallback((lat: number, lng: number, displayName: string, type: 'latlng' | 'pixel' | 'place', query: string) => {
    // Dispatch navigation event
    window.dispatchEvent(new CustomEvent('bitplace:navigate', {
      detail: { lat, lng, zoom: 12 }
    }));

    // Add to recent searches
    addRecentSearch({
      query,
      type,
      lat,
      lng,
      displayName,
    });

    // Close modal
    onOpenChange(false);
  }, [addRecentSearch, onOpenChange]);

  // Handle jump button click
  const handleJump = useCallback(() => {
    const parsed = parseSearchInput(inputValue);

    if (parsed.type === 'latlng') {
      navigateTo(parsed.lat, parsed.lng, formatCoords(parsed.lat, parsed.lng), 'latlng', inputValue);
    } else if (parsed.type === 'pixel') {
      const { lng, lat } = pixelToLngLat(parsed.x, parsed.y);
      navigateTo(lat, lng, formatPixel(parsed.x, parsed.y), 'pixel', inputValue);
    }
  }, [inputValue, navigateTo]);

  // Handle place result click
  const handlePlaceClick = useCallback((place: PlaceResult) => {
    navigateTo(place.lat, place.lng, place.name, 'place', place.name.split(',')[0]);
  }, [navigateTo]);

  // Handle recent search click
  const handleRecentClick = useCallback((recent: RecentSearch) => {
    navigateTo(recent.lat, recent.lng, recent.displayName, recent.type, recent.query);
  }, [navigateTo]);

  // Handle Enter key
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const parsed = parseSearchInput(inputValue);
      if (parsed.type === 'latlng' || parsed.type === 'pixel') {
        handleJump();
      } else if (parsed.type === 'place' && searchResults.length > 0) {
        handlePlaceClick(searchResults[0]);
      }
    }
  }, [inputValue, handleJump, handlePlaceClick, searchResults]);

  const getTypeLabel = () => {
    switch (parsedType) {
      case 'latlng': return 'Coordinates';
      case 'pixel': return 'Pixel';
      case 'place': return 'Place';
      default: return null;
    }
  };

  const canJump = parsedType === 'latlng' || parsedType === 'pixel';

  return (
    <GameModal
      open={open}
      onOpenChange={onOpenChange}
      title="Search"
      description="Jump to coordinates or find places"
      icon={<Search className="h-5 w-5" />}
    >
      <div className="space-y-4">
        {/* Search input */}
        <div className="relative">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="lat,lng · x:y · or place name..."
            className="bg-background/50 border-border/50 pr-20"
          />
          {inputValue && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2"
              onClick={() => setInputValue("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Type indicator and jump button */}
        {parsedType && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
              Detected: {getTypeLabel()}
            </span>
            {canJump && (
              <Button size="sm" onClick={handleJump} className="gap-1">
                <Navigation className="h-3 w-3" />
                Jump
              </Button>
            )}
          </div>
        )}

        {/* Search error */}
        {searchError && (
          <p className="text-sm text-destructive">{searchError}</p>
        )}

        {/* Loading indicator */}
        {isSearching && (
          <div className="flex items-center justify-center py-4 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span className="text-sm">Searching...</span>
          </div>
        )}

        {/* Place results */}
        {!isSearching && searchResults.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Results
            </h4>
            <ScrollArea className="max-h-48">
              <div className="space-y-1">
                {searchResults.map((place, i) => (
                  <button
                    key={i}
                    onClick={() => handlePlaceClick(place)}
                    className="w-full flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                  >
                    <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span className="text-sm line-clamp-2">{place.name}</span>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Recent searches */}
        {recentSearches.length > 0 && !searchResults.length && !isSearching && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Recent
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearRecentSearches}
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Clear all
              </Button>
            </div>
            <ScrollArea className="max-h-40">
              <div className="space-y-1">
                {recentSearches.map((recent) => (
                  <button
                    key={recent.id}
                    onClick={() => handleRecentClick(recent)}
                    className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                  >
                    <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm truncate flex-1">{recent.query}</span>
                    <span className="text-xs text-muted-foreground capitalize">
                      {recent.type}
                    </span>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Empty state */}
        {!parsedType && !searchResults.length && !recentSearches.length && !isSearching && (
          <div className="text-center py-6 text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Enter coordinates or a place name</p>
            <p className="text-xs mt-1 opacity-70">
              Examples: 41.9028, 12.4964 · 12345:67890 · Tokyo
            </p>
          </div>
        )}
      </div>
    </GameModal>
  );
}
