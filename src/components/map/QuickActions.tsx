import { useState } from 'react';
import { PixelIcon } from '@/components/icons';
import { GlassIconButton } from '@/components/ui/glass-icon-button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { SearchModal } from '@/components/modals/SearchModal';
import { NotificationsPanel } from '@/components/modals/NotificationsPanel';
import { useWallet } from '@/contexts/WalletContext';
import { useAllianceInvites } from '@/hooks/useAllianceInvites';
import { useNotifications } from '@/hooks/useNotifications';

export function QuickActions() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const { user } = useWallet();
  const { invites } = useAllianceInvites(user?.id);
  const { unreadCount: notificationUnread } = useNotifications(user?.id);
  
  // Combined unread count (invites + other notifications)
  const totalUnread = invites.length + notificationUnread;

  return (
    <>
      <div className="flex flex-col gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <GlassIconButton
              onClick={() => setSearchOpen(true)}
              aria-label="Search location"
            >
              <PixelIcon name="search" size="sm" />
            </GlassIconButton>
          </TooltipTrigger>
          <TooltipContent side="right">Search location</TooltipContent>
        </Tooltip>

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
          <TooltipContent side="right">Notifications</TooltipContent>
        </Tooltip>
      </div>

      <SearchModal open={searchOpen} onOpenChange={setSearchOpen} />
      <NotificationsPanel open={notificationsOpen} onOpenChange={setNotificationsOpen} />
    </>
  );
}
