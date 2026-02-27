import { useState } from 'react';
import { PixelIcon } from '@/components/icons';
import { GlassIconButton } from '@/components/ui/glass-icon-button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { NotificationsPanel } from '@/components/modals/NotificationsPanel';
import { useWallet } from '@/contexts/WalletContext';
import { useAllianceInvites } from '@/hooks/useAllianceInvites';
import { useNotifications } from '@/hooks/useNotifications';

interface ZoomControlsProps {
  artOpacity: number;
  onToggleArtOpacity: () => void;
}

export function ZoomControls({
  artOpacity,
  onToggleArtOpacity,
}: ZoomControlsProps) {
  const isReduced = artOpacity < 1;
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const { user } = useWallet();
  const { invites } = useAllianceInvites(user?.id);
  const { unreadCount: notificationUnread } = useNotifications(user?.id);
  const totalUnread = invites.length + notificationUnread;

  return (
    <>
      <div className="flex flex-col gap-2 mb-safe" data-tour="bottom-right-controls">
        {/* Art Opacity Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <GlassIconButton
              variant={isReduced ? "active" : "default"}
              onClick={onToggleArtOpacity}
              aria-label={isReduced ? "Show art" : "Reduce art opacity"}
            >
              <PixelIcon name={isReduced ? "eyeOff" : "eye"} size="sm" />
            </GlassIconButton>
          </TooltipTrigger>
          <TooltipContent side="left">
            {isReduced ? "Show pixel art" : "Reduce pixel art opacity"}
          </TooltipContent>
        </Tooltip>

        {/* Notifications */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative">
              <GlassIconButton
                onClick={() => setNotificationsOpen(true)}
                aria-label="Notifications"
              >
                <PixelIcon name="bell" size="sm" />
              </GlassIconButton>
              {totalUnread > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center pointer-events-none">
                  {totalUnread > 99 ? "99+" : totalUnread}
                </span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="left">Notifications</TooltipContent>
        </Tooltip>
      </div>

      <NotificationsPanel open={notificationsOpen} onOpenChange={setNotificationsOpen} />
    </>
  );
}
