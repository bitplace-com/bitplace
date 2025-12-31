import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const RECENT_KEY = 'bitplace-recent-searches';
const MAX_RECENT = 10;

export interface RecentSearch {
  id: string;
  query: string;
  type: 'latlng' | 'pixel' | 'place';
  lat: number;
  lng: number;
  displayName: string;
  timestamp: number;
}

export interface PlaceResult {
  name: string;
  lat: number;
  lng: number;
  type: string;
}

export function useSearch() {
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Load recent searches from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load recent searches:', e);
    }
  }, []);

  // Add a search to recent list
  const addRecentSearch = useCallback((search: Omit<RecentSearch, 'id' | 'timestamp'>) => {
    const newSearch: RecentSearch = {
      ...search,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    setRecentSearches(prev => {
      // Remove duplicates (same query)
      const filtered = prev.filter(s => s.query.toLowerCase() !== search.query.toLowerCase());
      // Add new search at the beginning, limit to MAX_RECENT
      const updated = [newSearch, ...filtered].slice(0, MAX_RECENT);
      // Persist to localStorage
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save recent searches:', e);
      }
      return updated;
    });
  }, []);

  // Search for places via edge function
  const searchPlaces = useCallback(async (query: string): Promise<PlaceResult[]> => {
    if (!query.trim()) {
      setSearchResults([]);
      return [];
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const { data, error } = await supabase.functions.invoke('geocode', {
        body: { query: query.trim() }
      });

      if (error) {
        console.error('Geocode error:', error);
        setSearchError('Search failed. Please try again.');
        setSearchResults([]);
        return [];
      }

      const places = data?.places || [];
      setSearchResults(places);
      return places;
    } catch (err) {
      console.error('Geocode error:', err);
      setSearchError('Search failed. Please try again.');
      setSearchResults([]);
      return [];
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Clear all recent searches
  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_KEY);
    } catch (e) {
      console.error('Failed to clear recent searches:', e);
    }
  }, []);

  // Clear search results
  const clearSearchResults = useCallback(() => {
    setSearchResults([]);
    setSearchError(null);
  }, []);

  return {
    recentSearches,
    searchResults,
    isSearching,
    searchError,
    searchPlaces,
    addRecentSearch,
    clearRecentSearches,
    clearSearchResults,
  };
}
