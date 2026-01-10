import { BitplaceMap } from '@/components/map/BitplaceMap';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { useRealtimePixelStatus } from '@/hooks/useRealtimePixelStatus';
import { useWallet } from '@/contexts/WalletContext';

const MapPage = () => {
  const { user } = useWallet();

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
    </div>
  );
};

export default MapPage;
