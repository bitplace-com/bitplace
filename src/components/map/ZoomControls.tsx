import { useState, useMemo } from 'react';
import { PixelIcon } from '@/components/icons';
import { GlassIconButton } from '@/components/ui/glass-icon-button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { NotificationsPanel } from '@/components/modals/NotificationsPanel';
import { PlacesModal } from '@/components/modals/PlacesModal';
import { useWallet } from '@/contexts/WalletContext';
import { useAllianceInvites } from '@/hooks/useAllianceInvites';
import { useNotifications } from '@/hooks/useNotifications';
import { usePinnedPlaces } from '@/hooks/usePinnedPlaces';

const PINS_SEEN_KEY = 'bitplace-pins-seen-count';

interface ZoomControlsProps {
  artOpacity: number;
  onToggleArtOpacity: () => void;
  currentLat?: number;
  currentLng?: number;
  currentZoom?: number;
}

export function ZoomControls({
  artOpacity,
  onToggleArtOpacity,
  currentLat = 0,
  currentLng = 0,
  currentZoom = 12,
}: ZoomControlsProps) {
  const isReduced = artOpacity < 1;
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [placesOpen, setPlacesOpen] = useState(false);

  const { user } = useWallet();
  const { invites } = useAllianceInvites(user?.id);
  const { unreadCount: notificationUnread } = useNotifications(user?.id);
  const totalUnread = invites.length + notificationUnread;

  const { pins } = usePinnedPlaces();
  const hasNewPins = useMemo(() => {
    try {
      const seenCount = Number(localStorage.getItem(PINS_SEEN_KEY) || '0');
      return pins.length > seenCount;
    } catch {
      return false;
    }
  }, [pins.length]);

  const handleOpenPlaces = () => {
    setPlacesOpen(true);
    try {
      localStorage.setItem(PINS_SEEN_KEY, String(pins.length));
    } catch {}
  };

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

        {/* Pinned Locations */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative">
              <GlassIconButton
                onClick={handleOpenPlaces}
                aria-label="Pinned Locations"
              >
                <PixelIcon name="locationPin" size="sm" />
              </GlassIconButton>
              {hasNewPins && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary pointer-events-none" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="left">Pinned Locations</TooltipContent>
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

      <PlacesModal
        open={placesOpen}
        onOpenChange={setPlacesOpen}
        currentLat={currentLat}
        currentLng={currentLng}
        currentZoom={currentZoom}
      />
      <NotificationsPanel open={notificationsOpen} onOpenChange={setNotificationsOpen} />
    </>
  );
}
