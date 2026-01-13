import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getAuthHeadersOrExpire } from '@/lib/authHelpers';

export type NotificationType = 
  | 'ALLIANCE_INVITE' 
  | 'PIXEL_TAKEOVER' 
  | 'PIXEL_DEFENDED' 
  | 'PIXEL_ATTACKED' 
  | 'SYSTEM';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  meta: Record<string, any>;
  isRead: boolean;
  createdAt: string;
}

interface UseNotificationsResult {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useNotifications(userId: string | undefined): UseNotificationsResult {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    const headers = getAuthHeadersOrExpire();
    if (!userId || !headers) {
      setNotifications([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await supabase.functions.invoke('notifications-manage', {
        body: { action: 'get' },
        headers,
      });

      if (response.error) {
        console.error('[useNotifications] Error:', response.error);
        return;
      }

      const data = response.data;
      if (data?.notifications) {
        setNotifications(data.notifications.map((n: any) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          body: n.body,
          meta: n.meta || {},
          isRead: n.is_read,
          createdAt: n.created_at,
        })));
      }
    } catch (err) {
      console.error('[useNotifications] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const markAsRead = useCallback(async (id: string) => {
    const headers = getAuthHeadersOrExpire();
    if (!headers) return;

    try {
      await supabase.functions.invoke('notifications-manage', {
        body: { action: 'mark-read', notificationIds: [id] },
        headers,
      });

      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error('[useNotifications] Mark read error:', err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    const headers = getAuthHeadersOrExpire();
    if (!headers) return;

    try {
      await supabase.functions.invoke('notifications-manage', {
        body: { action: 'mark-all-read' },
        headers,
      });

      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('[useNotifications] Mark all read error:', err);
    }
  }, []);

  const deleteNotification = useCallback(async (id: string) => {
    const headers = getAuthHeadersOrExpire();
    if (!headers) return;

    try {
      await supabase.functions.invoke('notifications-manage', {
        body: { action: 'delete', notificationIds: [id] },
        headers,
      });

      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('[useNotifications] Delete error:', err);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refetch: fetchNotifications,
  };
}
