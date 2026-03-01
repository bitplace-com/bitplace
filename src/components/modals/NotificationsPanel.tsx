import { useState, useEffect } from "react";
import { PixelIcon } from "@/components/icons";
import { GamePanel } from "./GamePanel";
import { Button } from "@/components/ui/button";
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

const typeIcons: Record<NotificationType, { icon: string; color: string }> = {
  ALLIANCE_INVITE: { icon: "users", color: "text-primary" },
  PIXEL_TAKEOVER: { icon: "brush", color: "text-destructive" },
  PIXEL_DEFENDED: { icon: "shield", color: "text-emerald-500" },
  PIXEL_ATTACKED: { icon: "swords", color: "text-amber-500" },
  SYSTEM: { icon: "bell", color: "text-muted-foreground" },
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
    refetch,
  } = useNotifications(user?.id);

  const { invites, acceptInvite, declineInvite, refetch: refetchInvites } = useAllianceInvites(user?.id);
  const { refetch: refetchAlliance } = useAlliance(user?.id);

  const [processingId, setProcessingId] = useState<string | null>(null);

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
  };

  // Combine notifications with alliance invites
  const allianceInviteNotifications = notifications.filter(n => n.type === "ALLIANCE_INVITE");
  const otherNotifications = notifications.filter(n => n.type !== "ALLIANCE_INVITE");

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
      <div className="flex flex-col gap-1">
        {/* Mark all as read */}
        {unreadCount > 0 && (
          <div className="flex justify-end pb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs text-muted-foreground hover:text-foreground h-7 px-2"
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
          <div className="flex flex-col gap-1.5">
            {/* Alliance invites (actionable) */}
            {invitesWithNotifications.map(({ invite, notification }) => (
              <AllianceInviteCard
                key={invite.id}
                invite={invite}
                notification={notification}
                processingId={processingId}
                onAccept={handleAcceptInvite}
                onDecline={handleDeclineInvite}
              />
            ))}

            {/* Other notifications */}
            {otherNotifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onClick={handleNotificationClick}
              />
            ))}
          </div>
        )}
      </div>
    </GamePanel>
  );
}

/* ═══════════════════════ Sub-components ═══════════════════════ */

function formatTime(dateStr: string) {
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
}

/** Extracts a clean body text removing duplicate coordinate info */
function getCleanBody(notification: Notification): string | null {
  const { body, meta } = notification;
  if (!body) return null;

  // If meta has pixel coordinates, strip them from the body to avoid duplication
  if (meta?.pixel_x !== undefined && meta?.pixel_y !== undefined) {
    // Remove patterns like "at (1102103, 750509)" or "at (1102103,750509)"
    return body
      .replace(/\s*at\s*\(\s*\d+\s*,\s*\d+\s*\)\s*$/i, "")
      .replace(/\s*\(\s*\d+\s*,\s*\d+\s*\)\s*$/i, "")
      .trim() || null;
  }

  return body;
}

function NotificationCard({
  notification,
  onClick,
}: {
  notification: Notification;
  onClick: (n: Notification) => void;
}) {
  const typeInfo = typeIcons[notification.type] || typeIcons.SYSTEM;
  const cleanBody = getCleanBody(notification);
  const hasCoords = notification.meta?.pixel_x !== undefined;
  const color = notification.meta?.color as string | undefined;

  return (
    <button
      onClick={() => onClick(notification)}
      className={cn(
        "w-full text-left px-3 py-2.5 rounded-lg border transition-colors",
        "hover:bg-accent/50 active:bg-accent/70",
        !notification.isRead
          ? "bg-primary/5 border-primary/20"
          : "bg-transparent border-border/40"
      )}
    >
      <div className="flex items-start gap-2.5">
        {/* Icon */}
        <div className="mt-0.5 shrink-0">
          <PixelIcon name={typeInfo.icon as any} className={cn("h-4 w-4", typeInfo.color)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-foreground truncate">
              {notification.title}
            </span>
            {!notification.isRead && (
              <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
            )}
          </div>

          {cleanBody && (
            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
              {cleanBody}
            </p>
          )}

          {/* Meta row: time + coords + color swatch */}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[10px] text-muted-foreground">
              {formatTime(notification.createdAt)}
            </span>

            {hasCoords && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <PixelIcon name="pin" className="h-2.5 w-2.5" />
                ({notification.meta.pixel_x}, {notification.meta.pixel_y})
              </span>
            )}

            {color && (
              <span
                className="h-2.5 w-2.5 rounded-sm border border-border/60 shrink-0"
                style={{ backgroundColor: color }}
                title={`Color: ${color}`}
              />
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function AllianceInviteCard({
  invite,
  notification,
  processingId,
  onAccept,
  onDecline,
}: {
  invite: any;
  notification?: Notification;
  processingId: string | null;
  onAccept: (inviteId: string, allianceName: string, notificationId?: string) => void;
  onDecline: (inviteId: string, notificationId?: string) => void;
}) {
  const isProcessing = processingId === invite.id;

  return (
    <div
      className={cn(
        "px-3 py-3 rounded-lg border space-y-2.5 transition-colors",
        notification && !notification.isRead
          ? "bg-primary/5 border-primary/20"
          : "bg-transparent border-border/40"
      )}
    >
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 shrink-0">
          <PixelIcon name="users" className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-foreground">Alliance Invite</span>
            {notification && !notification.isRead && (
              <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            <span className="font-medium text-foreground">[{invite.allianceTag}] {invite.allianceName}</span>
            {" "}wants you to join!
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Invited by {invite.invitedByName} · {formatTime(invite.createdAt)}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          className="flex-1 h-8 text-xs"
          onClick={() => onAccept(invite.id, invite.allianceName, notification?.id)}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <PixelIcon name="loader" className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <>
              <PixelIcon name="check" className="h-3.5 w-3.5 mr-1" />
              Accept
            </>
          )}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 h-8 text-xs"
          onClick={() => onDecline(invite.id, notification?.id)}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <PixelIcon name="loader" className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <>
              <PixelIcon name="close" className="h-3.5 w-3.5 mr-1" />
              Decline
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
