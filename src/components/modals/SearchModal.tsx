import { useState, useEffect, useCallback, useRef } from "react";
import { PixelIcon } from "@/components/icons";
import { GamePanel } from "./GamePanel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSearch, type PlaceResult, type RecentSearch } from "@/hooks/useSearch";
import { usePinnedPlaces, type PinnedPlace } from "@/hooks/usePinnedPlaces";
import { parseSearchInput, pixelToLngLat, formatCoords, formatPixel } from "@/lib/coordinates";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { soundEngine } from "@/lib/soundEngine";

interface SearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchModal({ open, onOpenChange }: SearchModalProps) {
  const [inputValue, setInputValue] = useState("");
  const [parsedType, setParsedType] = useState<string | null>(null);
  const [editingPinId, setEditingPinId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
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

  const {
    pins: pinnedPlaces,
    removePin,
    renamePin,
    isPinned,
    togglePin,
  } = usePinnedPlaces();

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setInputValue("");
      clearSearchResults();
      setParsedType(null);
      setEditingPinId(null);
    }
  }, [open, clearSearchResults]);

  // Focus edit input when editing
  useEffect(() => {
    if (editingPinId) {
      setTimeout(() => editInputRef.current?.focus(), 50);
    }
  }, [editingPinId]);

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
  const navigateTo = useCallback((lat: number, lng: number, displayName: string, type: 'latlng' | 'pixel' | 'place', query: string, zoom?: number) => {
    // Dispatch navigation event
    window.dispatchEvent(new CustomEvent('bitplace:navigate', {
      detail: { lat, lng, zoom: zoom ?? 12 }
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

  // Handle pinned place click
  const handlePinnedClick = useCallback((pin: PinnedPlace) => {
    navigateTo(pin.lat, pin.lng, pin.label, 'place', pin.label, pin.zoom);
  }, [navigateTo]);

  // Handle toggle pin from search results or recent
  const handleTogglePin = useCallback(async (lat: number, lng: number, label: string) => {
    const wasPinned = isPinned(lat, lng);
    const success = await togglePin({ lat, lng, label });
    if (success) {
      if (wasPinned) {
        soundEngine.play('pin_remove');
        toast.success('Pin removed');
      } else {
        soundEngine.play('pin_create');
        toast.success(`${label} pinned!`);
      }
    }
  }, [togglePin, isPinned]);

  // Handle start editing pin
  const handleStartEdit = useCallback((pin: PinnedPlace) => {
    setEditingPinId(pin.id);
    setEditLabel(pin.label);
  }, []);

  // Handle save edit
  const handleSaveEdit = useCallback(async () => {
    if (!editingPinId || !editLabel.trim()) return;
    
    const success = await renamePin(editingPinId, editLabel.trim());
    if (success) {
      toast.success('Pin renamed');
    }
    setEditingPinId(null);
    setEditLabel("");
  }, [editingPinId, editLabel, renamePin]);

  // Handle delete pin
  const handleDeletePin = useCallback(async (pinId: string) => {
    const success = await removePin(pinId);
    if (success) {
      toast.success('Pin removed');
    }
  }, [removePin]);

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

  // Handle edit input key down
  const handleEditKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setEditingPinId(null);
      setEditLabel("");
    }
  }, [handleSaveEdit]);

  const getTypeLabel = () => {
    switch (parsedType) {
      case 'latlng': return 'Coordinates';
      case 'pixel': return 'Pixel';
      case 'place': return 'Place';
      default: return null;
    }
  };

  const canJump = parsedType === 'latlng' || parsedType === 'pixel';

  // Filter recent searches to exclude already pinned locations
  const filteredRecents = recentSearches.filter(
    r => !isPinned(r.lat, r.lng)
  );

  return (
    <GamePanel
      open={open}
      onOpenChange={onOpenChange}
      title="Search"
      description="Jump to coordinates or find places"
      icon={<PixelIcon name="search" className="h-5 w-5" />}
      size="sm"
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
              <PixelIcon name="close" className="h-4 w-4" />
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
                <PixelIcon name="navigation" className="h-3 w-3" />
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
            <PixelIcon name="loader" className="h-5 w-5 animate-spin mr-2" />
            <span className="text-sm">Searching...</span>
          </div>
        )}

        {/* Pinned places */}
        {pinnedPlaces.length > 0 && !isSearching && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Pinned
            </h4>
            <ScrollArea className="max-h-32">
              <div className="space-y-1">
                {pinnedPlaces.map((pin) => (
                  <div
                    key={pin.id}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    <PixelIcon name="star" className="h-4 w-4 text-primary shrink-0" />
                    
                    {editingPinId === pin.id ? (
                      <Input
                        ref={editInputRef}
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        onKeyDown={handleEditKeyDown}
                        onBlur={handleSaveEdit}
                        className="h-7 text-sm flex-1"
                      />
                    ) : (
                      <button
                        onClick={() => handlePinnedClick(pin)}
                        className="text-sm truncate flex-1 text-left hover:text-primary transition-colors"
                      >
                        {pin.label}
                      </button>
                    )}
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleStartEdit(pin)}
                      >
                        <PixelIcon name="pencil" className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleDeletePin(pin.id)}
                      >
                        <PixelIcon name="trash" className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handlePinnedClick(pin)}
                      >
                        <PixelIcon name="navigation" className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
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
                {searchResults.map((place, i) => {
                  const pinned = isPinned(place.lat, place.lng);
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
                    >
                      <PixelIcon name="pin" className="h-4 w-4 text-primary shrink-0" />
                      <button
                        onClick={() => handlePlaceClick(place)}
                        className="text-sm line-clamp-1 flex-1 text-left"
                      >
                        {place.name}
                      </button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity",
                          pinned && "opacity-100"
                        )}
                        onClick={() => handleTogglePin(place.lat, place.lng, place.name.split(',')[0])}
                      >
                        <PixelIcon name="star" className={cn(
                          "h-3.5 w-3.5",
                          pinned ? "text-primary" : "text-muted-foreground"
                        )} />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Recent searches */}
        {filteredRecents.length > 0 && !searchResults.length && !isSearching && (
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
                {filteredRecents.map((recent) => (
                  <div
                    key={recent.id}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    <PixelIcon name="clock" className="h-4 w-4 text-muted-foreground shrink-0" />
                    <button
                      onClick={() => handleRecentClick(recent)}
                      className="text-sm truncate flex-1 text-left"
                    >
                      {recent.query}
                    </button>
                    <span className="text-xs text-muted-foreground capitalize">
                      {recent.type}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleTogglePin(recent.lat, recent.lng, recent.displayName)}
                    >
                      <PixelIcon name="star" className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Empty state */}
        {!parsedType && !searchResults.length && !pinnedPlaces.length && !filteredRecents.length && !isSearching && (
          <div className="text-center py-6 text-muted-foreground">
            <PixelIcon name="search" className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Enter coordinates or a place name</p>
            <p className="text-xs mt-1 opacity-70">
              Examples: 41.9028, 12.4964 · 12345:67890 · Tokyo
            </p>
          </div>
        )}
      </div>
    </GamePanel>
  );
}
