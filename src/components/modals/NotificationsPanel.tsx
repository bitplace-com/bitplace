import { useState } from "react";
import { Bell, Users, Check, X, Loader2 } from "lucide-react";
import { GameModal } from "./GameModal";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/contexts/WalletContext";
import { useAllianceInvites } from "@/hooks/useAllianceInvites";
import { useAlliance } from "@/hooks/useAlliance";

interface NotificationsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationsPanel({ open, onOpenChange }: NotificationsPanelProps) {
  const { toast } = useToast();
  const { user, refreshUser } = useWallet();
  const { invites, isLoading, acceptInvite, declineInvite, refetch } = useAllianceInvites(user?.id);
  const { refetch: refetchAlliance } = useAlliance(user?.id);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleAccept = async (inviteId: string, allianceName: string) => {
    setProcessingId(inviteId);
    const success = await acceptInvite(inviteId);
    setProcessingId(null);
    
    if (success) {
      toast({ title: `Joined ${allianceName}!` });
      await refetchAlliance();
      await refreshUser();
    } else {
      toast({ title: "Failed to accept invite", variant: "destructive" });
    }
  };

  const handleDecline = async (inviteId: string) => {
    setProcessingId(inviteId);
    const success = await declineInvite(inviteId);
    setProcessingId(null);
    
    if (success) {
      toast({ title: "Invite declined" });
    } else {
      toast({ title: "Failed to decline invite", variant: "destructive" });
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

  return (
    <GameModal
      open={open}
      onOpenChange={onOpenChange}
      title="Notifications"
      description="Alliance invites and updates"
      icon={<Bell className="h-5 w-5" />}
      size="md"
    >
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : invites.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Bell className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No notifications</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-3">
              {invites.map((invite) => (
                <div
                  key={invite.id}
                  className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Alliance Invite</p>
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
                      className="flex-1"
                      onClick={() => handleAccept(invite.id, invite.allianceName)}
                      disabled={processingId === invite.id}
                    >
                      {processingId === invite.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          Accept
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleDecline(invite.id)}
                      disabled={processingId === invite.id}
                    >
                      {processingId === invite.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <X className="h-4 w-4 mr-1" />
                          Decline
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </GameModal>
  );
}