import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PixelIcon } from "@/components/icons";
import { GlassSheet } from "@/components/ui/glass-sheet";
import { usePlaces, Place, FeedCategory } from "@/hooks/usePlaces";
import { useWallet } from "@/contexts/WalletContext";
import { PlaceCard } from "@/components/places/PlaceCard";
import { CreatePlaceForm } from "@/components/places/CreatePlaceForm";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { soundEngine } from "@/lib/soundEngine";
import { hapticsEngine } from "@/lib/hapticsEngine";

interface PlacesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentLat?: number;
  currentLng?: number;
  currentZoom?: number;
}

type MainTab = "discover" | "my";

export function PlacesModal({
  open,
  onOpenChange,
  currentLat = 0,
  currentLng = 0,
  currentZoom = 12,
}: PlacesModalProps) {
  const { isAuthenticated } = useWallet();
  const {
    feed, isLoadingFeed, hasMore, loadFeed,
    savedPlaces, createdPlaces, isLoadingMy, loadMyPlaces,
    createPlace, isCreating, toggleLike, toggleSave,
  } = usePlaces();

  const [mainTab, setMainTab] = useState<MainTab>("discover");
  const [feedCategory, setFeedCategory] = useState<FeedCategory>("new");
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Load data when modal opens or tab changes
  useEffect(() => {
    if (open) {
      if (mainTab === "discover") {
        loadFeed(feedCategory, { reset: true });
      } else if (mainTab === "my") {
        loadMyPlaces();
      }
    }
  }, [open, mainTab, feedCategory, loadFeed, loadMyPlaces]);

  const handleMainTabChange = (tab: string) => {
    setMainTab(tab as MainTab);
    setShowCreateForm(false);
  };

  const handleFeedCategoryChange = (category: string) => {
    setFeedCategory(category as FeedCategory);
  };

  const handleNavigate = useCallback((place: Place) => {
    onOpenChange(false);
    // Emit navigation event for BitplaceMap to handle
    window.dispatchEvent(new CustomEvent("bitplace:navigate", {
      detail: { lat: place.lat, lng: place.lng, zoom: place.zoom }
    }));
  }, [onOpenChange]);

  const handleCreatePlace = async (data: { title: string; description?: string; lat: number; lng: number; zoom: number }) => {
    const place = await createPlace(data);
    if (place) {
      toast.success("Pinned!", { description: place.title });
      setShowCreateForm(false);
      setMainTab("my");
      loadMyPlaces();
    }
  };

  const handleToggleLike = async (placeId: string) => {
    const liked = await toggleLike(placeId);
    // Sound + haptic feedback
    soundEngine.play(liked ? 'like' : 'unlike');
    hapticsEngine.trigger('like');
    toast.success(liked ? "Liked!" : "Unliked", { duration: 1500 });
  };

  const handleToggleSave = async (placeId: string) => {
    const saved = await toggleSave(placeId);
    // Sound + haptic feedback
    soundEngine.play(saved ? 'save' : 'unsave');
    hapticsEngine.trigger('like');
    toast.success(saved ? "Saved!" : "Removed", { duration: 1500 });
  };

  const renderPlacesList = (places: Place[], isLoading: boolean, emptyMessage: string) => {
    if (isLoading && places.length === 0) {
      return (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      );
    }

    if (places.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <PixelIcon name="map" size="lg" className="text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {places.map((place) => (
          <PlaceCard
            key={place.id}
            place={place}
            onNavigate={handleNavigate}
            onToggleLike={handleToggleLike}
            onToggleSave={handleToggleSave}
            isAuthenticated={isAuthenticated}
          />
        ))}
      </div>
    );
  };

  return (
    <GlassSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Pinned Locations"
      description="Discover and save interesting places"
      icon={<PixelIcon name="locationPin" className="h-5 w-5" />}
      size="md"
    >
      {/* Main Tabs: Discover / My Pins */}
      <Tabs value={mainTab} onValueChange={handleMainTabChange} className="flex flex-col h-full">
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="discover" className="gap-1.5">
            <PixelIcon name="globe" size="sm" />
            Discover
          </TabsTrigger>
          <TabsTrigger value="my" className="gap-1.5">
            <PixelIcon name="pin" size="sm" />
            My Pins
          </TabsTrigger>
        </TabsList>

        {/* Discover Tab */}
        <TabsContent value="discover" className="flex-1 flex flex-col mt-0 data-[state=inactive]:hidden">
          {/* Sub-tabs: New / Trending / Popular */}
          <div className="flex gap-1 mb-4">
            {(["new", "trending", "popular"] as FeedCategory[]).map((cat) => (
              <button
                key={cat}
                onClick={() => handleFeedCategoryChange(cat)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
                  feedCategory === cat
                    ? "bg-foreground text-background"
                    : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>

          <ScrollArea className="flex-1 -mx-6 px-6">
            {renderPlacesList(feed, isLoadingFeed, "No places yet. Be the first!")}
          </ScrollArea>
        </TabsContent>

        {/* My Pins Tab */}
        <TabsContent value="my" className="flex-1 flex flex-col mt-0 data-[state=inactive]:hidden">
          {!isAuthenticated ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <PixelIcon name="wallet" size="lg" className="text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">Connect wallet to see your pins</p>
            </div>
          ) : showCreateForm ? (
            <CreatePlaceForm
              currentLat={currentLat}
              currentLng={currentLng}
              currentZoom={currentZoom}
              onSubmit={handleCreatePlace}
              onCancel={() => setShowCreateForm(false)}
              isSubmitting={isCreating}
            />
          ) : (
            <>
              {/* Create Pin CTA */}
              <Button
                onClick={() => setShowCreateForm(true)}
                variant="outline"
                className="mb-4 border-dashed border-2 h-12"
              >
                <PixelIcon name="plus" size="sm" className="mr-2" />
                Create Pin at Current Location
              </Button>

              <ScrollArea className="flex-1 -mx-6 px-6">
                <div className="space-y-6">
                  {/* Saved Places */}
                  <div>
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <PixelIcon name="heart" size="xs" />
                      Saved
                    </h3>
                    {renderPlacesList(savedPlaces, isLoadingMy, "No saved places yet.")}
                  </div>

                  {/* Created Places */}
                  <div>
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <PixelIcon name="star" size="xs" />
                      Created by Me
                    </h3>
                    {renderPlacesList(createdPlaces, isLoadingMy, "You haven't created any places.")}
                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </TabsContent>
      </Tabs>
    </GlassSheet>
  );
}
