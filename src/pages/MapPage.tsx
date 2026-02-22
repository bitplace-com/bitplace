import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BitplaceMap } from '@/components/map/BitplaceMap';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { useRealtimePixelStatus } from '@/hooks/useRealtimePixelStatus';
import { useWallet } from '@/contexts/WalletContext';
import { PlayerProfileModal } from '@/components/modals/PlayerProfileModal';

const MapPage = () => {
  const { user } = useWallet();
  const [searchParams, setSearchParams] = useSearchParams();
  const playerParam = searchParams.get('player');
  const [profileOpen, setProfileOpen] = useState(false);

  // Open PlayerProfileModal when ?player=ID is present
  useEffect(() => {
    if (playerParam) {
      setProfileOpen(true);
    }
  }, [playerParam]);

  const handleProfileClose = (open: boolean) => {
    setProfileOpen(open);
    if (!open && playerParam) {
      // Remove ?player param from URL without reload
      searchParams.delete('player');
      setSearchParams(searchParams, { replace: true });
    }
  };

  // Real-time notifications with toasts and sounds
  useRealtimeNotifications(user?.id, {
    showToasts: true,
    playSounds: true,
  });

  // Real-time pixel status tracking (attacks, ownership changes)
  useRealtimePixelStatus(user?.id, {
    showToasts: true,
    playSounds: true,
  });

  return (
    <div className="w-full h-full overflow-hidden">
      <BitplaceMap />
      {playerParam && (
        <PlayerProfileModal
          open={profileOpen}
          onOpenChange={handleProfileClose}
          playerId={playerParam}
        />
      )}
    </div>
  );
};

export default MapPage;
