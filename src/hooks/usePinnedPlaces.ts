import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWallet } from '@/contexts/WalletContext';

const LOCAL_STORAGE_KEY = 'bitplace-pinned-places';
const SESSION_TOKEN_KEY = 'bitplace_session_token';

export interface PinnedPlace {
  id: string;
  label: string;
  lat: number;
  lng: number;
  zoom: number;
  createdAt: Date;
}

interface DbPin {
  id: string;
  label: string;
  lat: number;
  lng: number;
  zoom: number;
  created_at: string;
}

function dbPinToPlace(pin: DbPin): PinnedPlace {
  return {
    id: pin.id,
    label: pin.label,
    lat: pin.lat,
    lng: pin.lng,
    zoom: pin.zoom,
    createdAt: new Date(pin.created_at),
  };
}

function getSessionToken(): string | null {
  try {
    return localStorage.getItem(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function usePinnedPlaces() {
  const [pins, setPins] = useState<PinnedPlace[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated } = useWallet();

  const loadFromLocalStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPins(parsed.map((p: any) => ({
          ...p,
          createdAt: new Date(p.createdAt),
        })));
      }
    } catch (e) {
      console.error('Failed to load pinned places from localStorage:', e);
    }
  }, []);

  const saveToLocalStorage = useCallback((newPins: PinnedPlace[]) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newPins));
    } catch (e) {
      console.error('Failed to save pinned places to localStorage:', e);
    }
  }, []);

  const loadFromDb = useCallback(async () => {
    const token = getSessionToken();
    if (!token) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('pins-manage', {
        body: { action: 'list' },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (error) throw error;
      setPins((data?.pins || []).map(dbPinToPlace));
    } catch (e) {
      console.error('Failed to load pinned places from DB:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load pins on mount and when auth changes
  useEffect(() => {
    if (isAuthenticated) {
      loadFromDb();
    } else {
      loadFromLocalStorage();
    }
  }, [isAuthenticated, loadFromDb, loadFromLocalStorage]);

  const addPin = useCallback(async (place: { label: string; lat: number; lng: number; zoom?: number }) => {
    const newPin: PinnedPlace = {
      id: crypto.randomUUID(),
      label: place.label,
      lat: place.lat,
      lng: place.lng,
      zoom: place.zoom ?? 12,
      createdAt: new Date(),
    };

    const token = getSessionToken();
    if (isAuthenticated && token) {
      try {
        const { data, error } = await supabase.functions.invoke('pins-manage', {
          body: { 
            action: 'add', 
            pin: { label: place.label, lat: place.lat, lng: place.lng, zoom: place.zoom ?? 12 } 
          },
          headers: { Authorization: `Bearer ${token}` },
        });

        if (error) throw error;
        if (data?.pin) {
          setPins(prev => [dbPinToPlace(data.pin), ...prev]);
          return true;
        }
      } catch (e: any) {
        if (e.message?.includes('409')) {
          console.warn('Location already pinned');
          return false;
        }
        console.error('Failed to add pin to DB:', e);
        return false;
      }
    } else {
      // Check for duplicates in localStorage
      const existing = pins.find(p => 
        Math.abs(p.lat - place.lat) < 0.0001 && Math.abs(p.lng - place.lng) < 0.0001
      );
      if (existing) return false;

      const newPins = [newPin, ...pins];
      setPins(newPins);
      saveToLocalStorage(newPins);
      return true;
    }
    return false;
  }, [isAuthenticated, pins, saveToLocalStorage]);

  const removePin = useCallback(async (pinId: string) => {
    const token = getSessionToken();
    if (isAuthenticated && token) {
      try {
        const { error } = await supabase.functions.invoke('pins-manage', {
          body: { action: 'remove', pinId },
          headers: { Authorization: `Bearer ${token}` },
        });

        if (error) throw error;
        setPins(prev => prev.filter(p => p.id !== pinId));
        return true;
      } catch (e) {
        console.error('Failed to remove pin from DB:', e);
        return false;
      }
    } else {
      const newPins = pins.filter(p => p.id !== pinId);
      setPins(newPins);
      saveToLocalStorage(newPins);
      return true;
    }
  }, [isAuthenticated, pins, saveToLocalStorage]);

  const renamePin = useCallback(async (pinId: string, newLabel: string) => {
    const token = getSessionToken();
    if (isAuthenticated && token) {
      try {
        const { data, error } = await supabase.functions.invoke('pins-manage', {
          body: { action: 'rename', pinId, newLabel },
          headers: { Authorization: `Bearer ${token}` },
        });

        if (error) throw error;
        if (data?.pin) {
          setPins(prev => prev.map(p => p.id === pinId ? dbPinToPlace(data.pin) : p));
          return true;
        }
      } catch (e) {
        console.error('Failed to rename pin in DB:', e);
        return false;
      }
    } else {
      const newPins = pins.map(p => p.id === pinId ? { ...p, label: newLabel } : p);
      setPins(newPins);
      saveToLocalStorage(newPins);
      return true;
    }
    return false;
  }, [isAuthenticated, pins, saveToLocalStorage]);

  const isPinned = useCallback((lat: number, lng: number) => {
    return pins.some(p => 
      Math.abs(p.lat - lat) < 0.0001 && Math.abs(p.lng - lng) < 0.0001
    );
  }, [pins]);

  const togglePin = useCallback(async (place: { label: string; lat: number; lng: number; zoom?: number }) => {
    const existingPin = pins.find(p => 
      Math.abs(p.lat - place.lat) < 0.0001 && Math.abs(p.lng - place.lng) < 0.0001
    );

    if (existingPin) {
      return await removePin(existingPin.id);
    } else {
      return await addPin(place);
    }
  }, [pins, addPin, removePin]);

  return {
    pins,
    isLoading,
    addPin,
    removePin,
    renamePin,
    isPinned,
    togglePin,
  };
}
