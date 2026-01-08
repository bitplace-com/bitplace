import { Bell } from "lucide-react";
import { GameModal } from "./GameModal";

interface NotificationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationsModal({ open, onOpenChange }: NotificationsModalProps) {
  return (
    <GameModal
      open={open}
      onOpenChange={onOpenChange}
      title="Notifications"
      icon={<Bell className="h-5 w-5" />}
      size="sm"
    >
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
          <Bell className="h-6 w-6 text-muted-foreground opacity-50" />
        </div>
        <p className="text-sm font-medium text-foreground mb-1">No notifications yet</p>
        <p className="text-xs text-muted-foreground">
          Activity updates will appear here
        </p>
      </div>
    </GameModal>
  );
}
