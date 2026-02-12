import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const SESSION_TOKEN_KEY = 'bitplace_session_token';

export interface PlaceCreator {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  country_code: string | null;
  level: number;
  pixels_painted_total: number;
}

export interface PlaceStats {
  likes_all_time: number;
  saves_all_time: number;
  total_pe: number;
}

export interface Place {
  id: string;
  title: string;
  description: string | null;
  lat: number;
  lng: number;
  zoom: number;
  center_x: number | null;
  center_y: number | null;
  bbox_xmin?: number | null;
  bbox_ymin?: number | null;
  bbox_xmax?: number | null;
  bbox_ymax?: number | null;
  created_at: string;
  creator: PlaceCreator | null;
  stats: PlaceStats;
  likedByMe: boolean;
  savedByMe: boolean;
  isOwner?: boolean;
  snapshot_url?: string | null;
}

export type FeedCategory = 'new' | 'trending' | 'popular';

function getSessionToken(): string | null {
  try {
    return localStorage.getItem(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function usePlaces() {
  const [feed, setFeed] = useState<Place[]>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  const [savedPlaces, setSavedPlaces] = useState<Place[]>([]);
  const [createdPlaces, setCreatedPlaces] = useState<Place[]>([]);
  const [isLoadingMy, setIsLoadingMy] = useState(false);

  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadFeed = useCallback(async (
    category: FeedCategory, 
    options: { limit?: number; offset?: number; reset?: boolean } = {}
  ) => {
    const { limit = 20, offset = 0, reset = false } = options;
    
    setIsLoadingFeed(true);
    try {
      const token = getSessionToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const { data, error } = await supabase.functions.invoke('places-feed', {
        body: { category, limit, offset },
        headers,
      });

      if (error) throw error;

      const places = data?.places || [];
      setHasMore(data?.hasMore ?? false);
      
      if (reset || offset === 0) {
        setFeed(places);
      } else {
        setFeed(prev => [...prev, ...places]);
      }
    } catch (e) {
      console.error('Failed to load places feed:', e);
    } finally {
      setIsLoadingFeed(false);
    }
  }, []);

  const loadMyPlaces = useCallback(async () => {
    const token = getSessionToken();
    if (!token) {
      setSavedPlaces([]);
      setCreatedPlaces([]);
      return;
    }

    setIsLoadingMy(true);
    try {
      const { data, error } = await supabase.functions.invoke('places-my', {
        body: {},
        headers: { Authorization: `Bearer ${token}` },
      });

      if (error) throw error;

      setSavedPlaces(data?.saved_places || []);
      setCreatedPlaces(data?.created_places || []);
    } catch (e) {
      console.error('Failed to load my places:', e);
    } finally {
      setIsLoadingMy(false);
    }
  }, []);

  const createPlace = useCallback(async (data: {
    title: string;
    description?: string;
    lat: number;
    lng: number;
    zoom?: number;
    bbox?: { xmin: number; ymin: number; xmax: number; ymax: number };
    mapSnapshot?: string;
  }): Promise<Place | null> => {
    const token = getSessionToken();
    if (!token) {
      console.error('Not authenticated');
      return null;
    }

    setIsCreating(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('places-create', {
        body: data,
        headers: { Authorization: `Bearer ${token}` },
      });

      if (error) throw error;

      const place = result?.place;
      if (place) {
        setCreatedPlaces(prev => [place, ...prev]);
        setFeed(prev => [place, ...prev]);
      }
      
      return place;
    } catch (e: any) {
      console.error('Failed to create place:', e);
      throw new Error(e.message || 'Failed to create place');
    } finally {
      setIsCreating(false);
    }
  }, []);

  const deletePlace = useCallback(async (placeId: string): Promise<boolean> => {
    const token = getSessionToken();
    if (!token) return false;

    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('places-delete', {
        body: { place_id: placeId },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (error) throw error;

      setCreatedPlaces(prev => prev.filter(p => p.id !== placeId));
      setFeed(prev => prev.filter(p => p.id !== placeId));
      setSavedPlaces(prev => prev.filter(p => p.id !== placeId));

      toast.success('Pin deleted');
      return true;
    } catch (e) {
      console.error('Failed to delete place:', e);
      toast.error('Failed to delete pin');
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, []);

  const toggleLike = useCallback(async (placeId: string): Promise<boolean> => {
    const token = getSessionToken();
    if (!token) {
      console.error('Not authenticated');
      return false;
    }

    try {
      const { data, error } = await supabase.functions.invoke('places-toggle-like', {
        body: { place_id: placeId },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (error) throw error;

      const { likedByMe, likes_count } = data;

      // Update in all state arrays
      const updatePlace = (place: Place): Place => {
        if (place.id !== placeId) return place;
        return {
          ...place,
          likedByMe,
          stats: { ...place.stats, likes_all_time: likes_count },
        };
      };

      setFeed(prev => prev.map(updatePlace));
      setSavedPlaces(prev => prev.map(updatePlace));
      setCreatedPlaces(prev => prev.map(updatePlace));

      return likedByMe;
    } catch (e) {
      console.error('Failed to toggle like:', e);
      return false;
    }
  }, []);

  const toggleSave = useCallback(async (placeId: string): Promise<boolean> => {
    const token = getSessionToken();
    if (!token) {
      console.error('Not authenticated');
      return false;
    }

    try {
      const { data, error } = await supabase.functions.invoke('places-toggle-save', {
        body: { place_id: placeId },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (error) throw error;

      const { savedByMe } = data;

      // Update in all state arrays
      const updatePlace = (place: Place): Place => {
        if (place.id !== placeId) return place;
        return { ...place, savedByMe };
      };

      setFeed(prev => prev.map(updatePlace));
      setCreatedPlaces(prev => prev.map(updatePlace));

      // Update saved places list
      if (savedByMe) {
        // Find the place to add
        const placeToAdd = feed.find(p => p.id === placeId) || 
                          createdPlaces.find(p => p.id === placeId);
        if (placeToAdd) {
          setSavedPlaces(prev => [{ ...placeToAdd, savedByMe: true }, ...prev]);
        }
      } else {
        setSavedPlaces(prev => prev.filter(p => p.id !== placeId));
      }

      return savedByMe;
    } catch (e) {
      console.error('Failed to toggle save:', e);
      return false;
    }
  }, [feed, createdPlaces]);

  return {
    // Feed
    feed,
    isLoadingFeed,
    hasMore,
    loadFeed,

    // My places
    savedPlaces,
    createdPlaces,
    isLoadingMy,
    loadMyPlaces,

    // Actions
    createPlace,
    isCreating,
    deletePlace,
    isDeleting,
    toggleLike,
    toggleSave,
  };
}
