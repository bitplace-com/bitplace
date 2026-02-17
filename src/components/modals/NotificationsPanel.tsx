import { useState, useEffect } from "react";
import { PixelIcon } from "@/components/icons";
import { GamePanel } from "./GamePanel";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/contexts/WalletContext";
import { useNotifications, type Notification, type NotificationType } from "@/hooks/useNotifications";
import { useAllianceInvites } from "@/hooks/useAllianceInvites";
import { useAlliance } from "@/hooks/useAlliance";
import { cn } from "@/lib/utils";

interface NotificationsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const typeIcons: Record<NotificationType, React.ReactNode> = {
  ALLIANCE_INVITE: <PixelIcon name="users" className="h-4 w-4 text-primary" />,
  PIXEL_TAKEOVER: <PixelIcon name="brush" className="h-4 w-4 text-destructive" />,
  PIXEL_DEFENDED: <PixelIcon name="shield" className="h-4 w-4 text-emerald-500" />,
  PIXEL_ATTACKED: <PixelIcon name="swords" className="h-4 w-4 text-amber-500" />,
  SYSTEM: <PixelIcon name="bell" className="h-4 w-4 text-muted-foreground" />,
};

const typeColors: Record<NotificationType, string> = {
  ALLIANCE_INVITE: "bg-primary/10",
  PIXEL_TAKEOVER: "bg-destructive/10",
  PIXEL_DEFENDED: "bg-emerald-500/10",
  PIXEL_ATTACKED: "bg-amber-500/10",
  SYSTEM: "bg-muted/50",
};

export function NotificationsPanel({ open, onOpenChange }: NotificationsPanelProps) {
  const { toast } = useToast();
  const { user, refreshUser } = useWallet();
  const { 
    notifications, 
    unreadCount, 
    isLoading, 
    markAsRead, 
    markAllAsRead,
    refetch 
  } = useNotifications(user?.id);
  
  // Also fetch alliance invites for accept/decline actions
  const { invites, acceptInvite, declineInvite, refetch: refetchInvites } = useAllianceInvites(user?.id);
  const { refetch: refetchAlliance } = useAlliance(user?.id);
  
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Mark notifications as read when panel opens
  useEffect(() => {
    if (open && unreadCount > 0) {
      // Don't auto-mark all as read immediately - let user see unread indicators
    }
  }, [open, unreadCount]);

  const handleAcceptInvite = async (inviteId: string, allianceName: string, notificationId?: string) => {
    setProcessingId(inviteId);
    const success = await acceptInvite(inviteId);
    setProcessingId(null);
    
    if (success) {
      toast({ title: `Joined ${allianceName}!` });
      await refetchAlliance();
      await refreshUser();
      if (notificationId) await markAsRead(notificationId);
      await refetch();
      await refetchInvites();
    } else {
      toast({ title: "Failed to accept invite", variant: "destructive" });
    }
  };

  const handleDeclineInvite = async (inviteId: string, notificationId?: string) => {
    setProcessingId(inviteId);
    const success = await declineInvite(inviteId);
    setProcessingId(null);
    
    if (success) {
      toast({ title: "Invite declined" });
      if (notificationId) await markAsRead(notificationId);
      await refetch();
      await refetchInvites();
    } else {
      toast({ title: "Failed to decline invite", variant: "destructive" });
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
    
    // Navigate to pixel if it's a pixel notification
    if (notification.meta?.pixel_x !== undefined && notification.meta?.pixel_y !== undefined) {
      // Could implement navigation here
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Combine notifications with alliance invites that might not have notifications yet
  const allianceInviteNotifications = notifications.filter(n => n.type === 'ALLIANCE_INVITE');
  const otherNotifications = notifications.filter(n => n.type !== 'ALLIANCE_INVITE');
  
  // Match invites with notifications
  const invitesWithNotifications = invites.map(invite => {
    const matchingNotification = allianceInviteNotifications.find(
      n => n.meta?.invite_id === invite.id
    );
    return { invite, notification: matchingNotification };
  });

  const hasContent = notifications.length > 0 || invites.length > 0;

  return (
    <GamePanel
      open={open}
      onOpenChange={onOpenChange}
      title="Notifications"
      description={undefined}
      icon={<PixelIcon name="bell" className="h-5 w-5" />}
      size="sm"
    >
      <div className="space-y-4">
        {/* Header with mark all as read */}
        {unreadCount > 0 && (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              <PixelIcon name="checkDouble" className="h-3.5 w-3.5 mr-1" />
              Mark all as read
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <PixelIcon name="loader" className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !hasContent ? (
          <div className="text-center py-12 text-muted-foreground">
            <PixelIcon name="bell" className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No notifications</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-3">
              {/* Alliance invites (actionable) */}
              {invitesWithNotifications.map(({ invite, notification }) => (
                <div
                  key={invite.id}
                  className={cn(
                    "p-4 rounded-xl border border-border/50 space-y-3 transition-colors",
                    notification && !notification.isRead 
                      ? "bg-primary/5 border-primary/20" 
                      : "bg-muted/30"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn("p-2 rounded-lg", typeColors.ALLIANCE_INVITE)}>
                      {typeIcons.ALLIANCE_INVITE}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">Alliance Invite</p>
                        {notification && !notification.isRead && (
                          <span className="h-2 w-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        <span className="font-medium text-foreground">[{invite.allianceTag}] {invite.allianceName}</span>
                        {" "}wants you to join!
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Invited by {invite.invitedByName} • {formatTime(invite.createdAt)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 min-h-[44px]"
                      onClick={() => handleAcceptInvite(invite.id, invite.allianceName, notification?.id)}
                      disabled={processingId === invite.id}
                    >
                      {processingId === invite.id ? (
                        <PixelIcon name="loader" className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <PixelIcon name="check" className="h-4 w-4 mr-1" />
                          Accept
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 min-h-[44px]"
                      onClick={() => handleDeclineInvite(invite.id, notification?.id)}
                      disabled={processingId === invite.id}
                    >
                      {processingId === invite.id ? (
                        <PixelIcon name="loader" className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <PixelIcon name="close" className="h-4 w-4 mr-1" />
                          Decline
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}

              {/* Other notifications (info only) */}
              {otherNotifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    "p-4 rounded-xl border border-border/50 cursor-pointer transition-colors hover:bg-accent/50",
                    !notification.isRead 
                      ? "bg-primary/5 border-primary/20" 
                      : "bg-muted/30"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn("p-2 rounded-lg", typeColors[notification.type])}>
                      {typeIcons[notification.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{notification.title}</p>
                        {!notification.isRead && (
                          <span className="h-2 w-2 rounded-full bg-primary" />
                        )}
                      </div>
                      {notification.body && (
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {notification.body}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-muted-foreground">
                          {formatTime(notification.createdAt)}
                        </p>
                        {notification.meta?.pixel_x !== undefined && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <PixelIcon name="pin" className="h-3 w-3" />
                            ({notification.meta.pixel_x}, {notification.meta.pixel_y})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </GamePanel>
  );
}
