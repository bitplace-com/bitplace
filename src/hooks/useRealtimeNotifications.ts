import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { soundEngine } from '@/lib/soundEngine';

interface RealtimeNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  meta: Record<string, unknown>;
  created_at: string;
}

export interface UseRealtimeNotificationsOptions {
  onNotification?: (notification: RealtimeNotification) => void;
  showToasts?: boolean;
  playSounds?: boolean;
}

export function useRealtimeNotifications(
  userId: string | undefined,
  options?: UseRealtimeNotificationsOptions
) {
  const { toast } = useToast();
  const { onNotification, showToasts = true, playSounds = true } = options || {};
  const onNotificationRef = useRef(onNotification);
  
  // Keep callback ref updated
  useEffect(() => {
    onNotificationRef.current = onNotification;
  }, [onNotification]);

  const handleNotification = useCallback((notification: RealtimeNotification) => {
    // Play appropriate sound based on notification type
    if (playSounds) {
      switch (notification.type) {
        case 'PIXEL_ATTACKED':
          soundEngine.play('alert_attack');
          break;
        case 'PIXEL_TAKEOVER':
          soundEngine.play('alert_lost');
          break;
        case 'PIXEL_DEFENDED':
          soundEngine.play('alert_defend');
          break;
        case 'PIXEL_REINFORCED':
          soundEngine.play('notification');
          break;
        case 'CONTRIBUTION_PURGED':
          soundEngine.play('alert_lost');
          break;
        default:
          soundEngine.play('notification');
      }
    }

    // Show toast based on notification type
    if (showToasts) {
      const isDestructive = 
        notification.type === 'PIXEL_ATTACKED' || 
        notification.type === 'PIXEL_TAKEOVER' ||
        notification.type === 'CONTRIBUTION_PURGED';
      
      toast({
        title: notification.title,
        description: notification.body || undefined,
        variant: isDestructive ? 'destructive' : 'default',
      });
    }

    // Callback for custom handling
    onNotificationRef.current?.(notification);
  }, [toast, playSounds, showToasts]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`realtime-notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const notification = payload.new as RealtimeNotification;
          handleNotification(notification);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, handleNotification]);
}
