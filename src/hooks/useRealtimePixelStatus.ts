import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { soundEngine } from '@/lib/soundEngine';
import { useToast } from '@/hooks/use-toast';

export interface PixelChange {
  type: 'atk_increased' | 'def_increased' | 'ownership_lost' | 'reinforced';
  pixelId: number;
  x: number;
  y: number;
  oldValue?: number;
  newValue?: number;
  timestamp: number;
}

interface PixelPayload {
  id: number;
  x: number;
  y: number;
  owner_user_id: string | null;
  atk_total: number;
  def_total: number;
}

export function useRealtimePixelStatus(
  userId: string | undefined,
  options?: {
    showToasts?: boolean;
    playSounds?: boolean;
  }
) {
  const { showToasts = true, playSounds = true } = options || {};
  const { toast } = useToast();
  const [recentChanges, setRecentChanges] = useState<PixelChange[]>([]);
  const ownedPixelIdsRef = useRef<Set<number>>(new Set());
  const pixelDataRef = useRef<Map<number, { atk_total: number; def_total: number }>>(new Map());

  // Fetch owned pixel IDs
  useEffect(() => {
    if (!userId) {
      ownedPixelIdsRef.current.clear();
      pixelDataRef.current.clear();
      return;
    }

    const fetchOwnedPixels = async () => {
      const { data } = await supabase
        .from('pixels')
        .select('id, atk_total, def_total')
        .eq('owner_user_id', userId);
      
      ownedPixelIdsRef.current = new Set((data || []).map(p => p.id));
      
      // Store current values for comparison
      pixelDataRef.current.clear();
      (data || []).forEach(p => {
        pixelDataRef.current.set(p.id, {
          atk_total: Number(p.atk_total) || 0,
          def_total: Number(p.def_total) || 0,
        });
      });
    };
    
    fetchOwnedPixels();
  }, [userId]);

  const handlePixelChange = useCallback((oldPixel: Partial<PixelPayload>, newPixel: PixelPayload) => {
    if (!userId) return;
    
    const wasOwned = ownedPixelIdsRef.current.has(newPixel.id);
    const nowOwned = newPixel.owner_user_id === userId;
    const prevData = pixelDataRef.current.get(newPixel.id);

    // Ownership changed (we lost the pixel)
    if (wasOwned && !nowOwned) {
      const change: PixelChange = {
        type: 'ownership_lost',
        pixelId: newPixel.id,
        x: newPixel.x,
        y: newPixel.y,
        timestamp: Date.now(),
      };
      
      setRecentChanges(prev => [change, ...prev].slice(0, 50));
      ownedPixelIdsRef.current.delete(newPixel.id);
      pixelDataRef.current.delete(newPixel.id);
      
      if (playSounds) {
        soundEngine.play('alert_lost');
      }
      if (showToasts) {
        toast({
          title: 'Pixel Lost!',
          description: `Your pixel at (${newPixel.x}, ${newPixel.y}) was taken over`,
          variant: 'destructive',
        });
      }
      return;
    }

    // ATK increased on our pixel
    if (wasOwned && nowOwned && prevData) {
      const oldAtk = prevData.atk_total;
      const newAtk = Number(newPixel.atk_total) || 0;
      
      if (newAtk > oldAtk) {
        const change: PixelChange = {
          type: 'atk_increased',
          pixelId: newPixel.id,
          x: newPixel.x,
          y: newPixel.y,
          oldValue: oldAtk,
          newValue: newAtk,
          timestamp: Date.now(),
        };
        
        setRecentChanges(prev => [change, ...prev].slice(0, 50));
        
        if (playSounds) {
          soundEngine.play('alert_attack');
        }
        if (showToasts) {
          toast({
            title: 'Pixel Under Attack!',
            description: `Attack on (${newPixel.x}, ${newPixel.y}) increased to ${newAtk} PE`,
            variant: 'destructive',
          });
        }
      }

      // DEF increased on our pixel (someone defended)
      const oldDef = prevData.def_total;
      const newDef = Number(newPixel.def_total) || 0;
      
      if (newDef > oldDef) {
        const change: PixelChange = {
          type: 'def_increased',
          pixelId: newPixel.id,
          x: newPixel.x,
          y: newPixel.y,
          oldValue: oldDef,
          newValue: newDef,
          timestamp: Date.now(),
        };
        
        setRecentChanges(prev => [change, ...prev].slice(0, 50));
        
        if (playSounds) {
          soundEngine.play('alert_defend');
        }
      }
      
      // Update stored values
      pixelDataRef.current.set(newPixel.id, {
        atk_total: newAtk,
        def_total: newDef,
      });
    }
    
    // We gained ownership of a new pixel
    if (!wasOwned && nowOwned) {
      ownedPixelIdsRef.current.add(newPixel.id);
      pixelDataRef.current.set(newPixel.id, {
        atk_total: Number(newPixel.atk_total) || 0,
        def_total: Number(newPixel.def_total) || 0,
      });
    }
  }, [userId, playSounds, showToasts, toast]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`realtime-pixels:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pixels',
        },
        (payload) => {
          const oldPixel = payload.old as Partial<PixelPayload>;
          const newPixel = payload.new as PixelPayload;
          handlePixelChange(oldPixel, newPixel);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, handlePixelChange]);

  const clearChange = useCallback((pixelId: number) => {
    setRecentChanges(prev => prev.filter(c => c.pixelId !== pixelId));
  }, []);

  const clearAllChanges = useCallback(() => {
    setRecentChanges([]);
  }, []);

  return { recentChanges, clearChange, clearAllChanges };
}
