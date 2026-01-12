import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PixelIcon } from "@/components/icons";
import { usePlaces, Place, FeedCategory } from "@/hooks/usePlaces";
import { useWallet } from "@/contexts/WalletContext";
import { PlaceCard } from "@/components/places/PlaceCard";
import { CreatePlaceForm } from "@/components/places/CreatePlaceForm";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface PlacesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigateToPlace?: (lat: number, lng: number, zoom: number) => void;
  currentLat?: number;
  currentLng?: number;
  currentZoom?: number;
}

export function PlacesModal({
  open,
  onOpenChange,
  onNavigateToPlace,
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

  const [activeTab, setActiveTab] = useState<string>("new");
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    if (open) {
      if (activeTab === "my") {
        loadMyPlaces();
      } else {
        loadFeed(activeTab as FeedCategory, { reset: true });
      }
    }
  }, [open, activeTab, loadFeed, loadMyPlaces]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setShowCreateForm(false);
  };

  const handleNavigate = (place: Place) => {
    onNavigateToPlace?.(place.lat, place.lng, place.zoom);
    onOpenChange(false);
  };

  const handleCreatePlace = async (data: { title: string; description?: string; lat: number; lng: number; zoom: number }) => {
    const place = await createPlace(data);
    if (place) {
      toast.success("Place created!");
      setShowCreateForm(false);
      setActiveTab("my");
      loadMyPlaces();
    }
  };

  const handleToggleLike = async (placeId: string) => {
    const liked = await toggleLike(placeId);
    toast.success(liked ? "Liked!" : "Unliked");
  };

  const handleToggleSave = async (placeId: string) => {
    const saved = await toggleSave(placeId);
    toast.success(saved ? "Saved!" : "Removed from saved");
  };

  const renderPlacesList = (places: Place[], isLoading: boolean, emptyMessage: string) => {
    if (isLoading && places.length === 0) {
      return (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      );
    }

    if (places.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <PixelIcon name="map" size="lg" className="text-muted-foreground mb-3" />
          <p className="text-muted-foreground">{emptyMessage}</p>
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-4 pt-4 pb-2">
          <SheetTitle className="flex items-center gap-2">
            <PixelIcon name="pin" size="md" />
            Places
          </SheetTitle>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col">
          <TabsList className="mx-4 grid grid-cols-4">
            <TabsTrigger value="new">New</TabsTrigger>
            <TabsTrigger value="trending">Trending</TabsTrigger>
            <TabsTrigger value="popular">Popular</TabsTrigger>
            <TabsTrigger value="my">My</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 px-4 py-4">
            {showCreateForm ? (
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
                <TabsContent value="new" className="mt-0">
                  {renderPlacesList(feed, isLoadingFeed, "No places yet. Be the first!")}
                </TabsContent>

                <TabsContent value="trending" className="mt-0">
                  {renderPlacesList(feed, isLoadingFeed, "No trending places right now.")}
                </TabsContent>

                <TabsContent value="popular" className="mt-0">
                  {renderPlacesList(feed, isLoadingFeed, "No popular places yet.")}
                </TabsContent>

                <TabsContent value="my" className="mt-0 space-y-6">
                  {!isAuthenticated ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <PixelIcon name="wallet" size="lg" className="text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">Connect wallet to see your places</p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-3">Saved</h3>
                        {renderPlacesList(savedPlaces, isLoadingMy, "No saved places yet.")}
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-3">Created</h3>
                        {renderPlacesList(createdPlaces, isLoadingMy, "You haven't created any places.")}
                      </div>
                    </>
                  )}
                </TabsContent>
              </>
            )}
          </ScrollArea>
        </Tabs>

        {/* Create button */}
        {isAuthenticated && !showCreateForm && (
          <div className="p-4 border-t border-border">
            <Button
              onClick={() => setShowCreateForm(true)}
              className="w-full"
            >
              <PixelIcon name="plus" size="sm" className="mr-2" />
              Create Place
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
