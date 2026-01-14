import { useEffect, useState } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { PixelIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/contexts/WalletContext';
import { cn } from '@/lib/utils';
import type { RealtimeStatus } from '@/hooks/useSupabasePixels';

interface DevDiagnosticsProps {
  map: MapLibreMap | null;
  zoom: number;
  canPaint: boolean;
  isSelecting: boolean;
  realtimeStatus?: RealtimeStatus;
  reconnectAttempts?: number;
}

export function DevDiagnostics({ 
  map, 
  zoom, 
  canPaint, 
  isSelecting,
  realtimeStatus = 'disconnected',
  reconnectAttempts = 0,
}: DevDiagnosticsProps) {
  const [visible, setVisible] = useState(false);
  const [center, setCenter] = useState<{ lng: number; lat: number }>({ lng: 0, lat: 0 });
  const [handlers, setHandlers] = useState({
    scrollZoom: false,
    dragPan: false,
    doubleClickZoom: false,
    touchZoomRotate: false,
  });

  const { isConnected, walletAddress, energy, user } = useWallet();

  // Check for debug mode
  const isDebugMode = typeof window !== 'undefined' && (
    localStorage.getItem('bitplace_debug') === '1' ||
    window.location.search.includes('debug=1')
  );

  useEffect(() => {
    if (!map) return;

    const updateState = () => {
      setCenter({
        lng: map.getCenter().lng,
        lat: map.getCenter().lat,
      });
      setHandlers({
        scrollZoom: map.scrollZoom.isEnabled(),
        dragPan: map.dragPan.isEnabled(),
        doubleClickZoom: map.doubleClickZoom.isEnabled(),
        touchZoomRotate: map.touchZoomRotate.isEnabled(),
      });
    };

    updateState();
    map.on('move', updateState);
    map.on('zoom', updateState);

    return () => {
      map.off('move', updateState);
      map.off('zoom', updateState);
    };
  }, [map]);

  // Detect Phantom provider
  const getProviderInfo = () => {
    if (typeof window === 'undefined') return { detected: false, source: null };
    const phantom = (window as any).phantom?.solana;
    if (phantom?.isPhantom) return { detected: true, source: 'phantom.solana' };
    const solana = (window as any).solana;
    if (solana?.isPhantom) return { detected: true, source: 'window.solana' };
    return { detected: false, source: null };
  };

  const providerInfo = getProviderInfo();

  // Get RPC URL based on cluster
  const getRpcUrl = () => {
    if (!energy.cluster) return 'Not connected';
    return energy.cluster === 'mainnet' 
      ? 'https://api.mainnet-beta.solana.com'
      : 'https://api.devnet.solana.com';
  };

  if (!visible) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setVisible(true)}
        className="absolute top-4 left-4 z-50 bg-secondary/95 backdrop-blur-sm border border-border h-8 w-8"
        title="Open Dev Diagnostics"
      >
        <PixelIcon name="bug" size="sm" />
      </Button>
    );
  }

  return (
    <div className="absolute top-4 left-4 z-50 bg-secondary/95 backdrop-blur-sm border border-border rounded-lg p-3 text-xs space-y-2 min-w-64 max-w-80 shadow-lg max-h-[80vh] overflow-y-auto">
      <div className="flex justify-between items-center border-b border-border pb-2">
        <span className="font-semibold text-foreground flex items-center gap-1.5">
          <PixelIcon name="bug" size="xs" />
          Dev Diagnostics
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setVisible(false)}
          className="h-5 w-5 p-0"
        >
          <PixelIcon name="close" size="xs" />
        </Button>
      </div>

      {/* Map Section */}
      <div className="space-y-1 text-muted-foreground">
        <div className="text-foreground font-medium mb-1">Map State</div>
        <div className="flex justify-between">
          <span>Zoom:</span>
          <span className="font-mono text-foreground">{zoom.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Center:</span>
          <span className="font-mono text-foreground text-right">
            {center.lng.toFixed(4)}, {center.lat.toFixed(4)}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Can Paint:</span>
          <span className={canPaint ? 'text-green-500 font-semibold' : 'text-muted-foreground'}>
            {canPaint ? 'YES' : 'NO'}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Is Selecting:</span>
          <span className={isSelecting ? 'text-primary font-semibold' : 'text-muted-foreground'}>
            {isSelecting ? 'YES' : 'NO'}
          </span>
        </div>
      </div>

      {/* Map Handlers */}
      <div className="border-t border-border pt-2 space-y-1">
        <div className="text-foreground font-medium mb-1">Map Handlers</div>
        <HandlerStatus name="scrollZoom" enabled={handlers.scrollZoom} />
        <HandlerStatus name="dragPan" enabled={handlers.dragPan} />
        <HandlerStatus name="doubleClickZoom" enabled={handlers.doubleClickZoom} />
        <HandlerStatus name="touchZoomRotate" enabled={handlers.touchZoomRotate} />
      </div>

      {/* Realtime Status (debug only) */}
      {isDebugMode && (
        <div className="border-t border-border pt-2 space-y-1">
          <div className="text-foreground font-medium mb-1 flex items-center gap-1.5">
            <PixelIcon name="refresh" size="xs" />
            Realtime Status
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status:</span>
            <span className={cn(
              'font-semibold',
              realtimeStatus === 'connected' && 'text-green-500',
              realtimeStatus === 'reconnecting' && 'text-amber-500',
              realtimeStatus === 'disconnected' && 'text-destructive',
            )}>
              {realtimeStatus.toUpperCase()}
            </span>
          </div>
          
          {realtimeStatus !== 'connected' && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Reconnect Attempts:</span>
              <span className="font-mono text-foreground">{reconnectAttempts}</span>
            </div>
          )}
          
          {realtimeStatus === 'disconnected' && (
            <div className="text-xs text-muted-foreground/80 mt-1 bg-muted/50 rounded px-2 py-1">
              Fallback polling active (12s interval)
            </div>
          )}
          
          {realtimeStatus === 'reconnecting' && (
            <div className="text-xs text-amber-500/80 mt-1">
              Attempting to reconnect...
            </div>
          )}
        </div>
      )}

      {/* Wallet & Balance Section (visible with ?debug=1) */}
      {isDebugMode && (
        <div className="border-t border-border pt-2 space-y-1">
          <div className="text-foreground font-medium mb-1 flex items-center gap-1.5">
            <PixelIcon name="wallet" size="xs" />
            Wallet Debug
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Provider:</span>
            <span className={providerInfo.detected ? 'text-green-500' : 'text-destructive'}>
              {providerInfo.source || 'Not detected'}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Connected:</span>
            <span className={isConnected ? 'text-green-500' : 'text-muted-foreground'}>
              {isConnected ? 'YES' : 'NO'}
            </span>
          </div>
          
          {walletAddress && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Public Key:</span>
              <span className="font-mono text-foreground text-right truncate max-w-32" title={walletAddress}>
                {walletAddress.substring(0, 8)}...{walletAddress.slice(-4)}
              </span>
            </div>
          )}
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cluster:</span>
            <span className={energy.cluster === 'mainnet' ? 'text-green-500' : 'text-amber-500'}>
              {energy.cluster?.toUpperCase() || 'N/A'}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">RPC URL:</span>
            <span className="font-mono text-foreground text-right text-[10px] truncate max-w-40" title={getRpcUrl()}>
              {getRpcUrl()}
            </span>
          </div>
        </div>
      )}

      {/* Balance Section (visible with ?debug=1) */}
      {isDebugMode && (
        <div className="border-t border-border pt-2 space-y-1">
          <div className="text-foreground font-medium mb-1 flex items-center gap-1.5">
            <PixelIcon name="bolt" size="xs" />
            Balance Debug
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">SOL Balance:</span>
            <span className="font-mono text-foreground">
              {energy.nativeBalance.toFixed(6)}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">SOL Price:</span>
            <span className="font-mono text-foreground">
              ${energy.usdPrice.toFixed(2)}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Wallet USD:</span>
            <span className="font-mono text-foreground">
              ${energy.walletUsd.toFixed(4)}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">PE Total:</span>
            <span className="font-mono text-primary font-semibold">
              {energy.peTotal.toLocaleString()}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Last Sync:</span>
            <span className="font-mono text-foreground text-right">
              {energy.lastSyncAt ? energy.lastSyncAt.toLocaleTimeString() : 'Never'}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Is Refreshing:</span>
            <span className={energy.isRefreshing ? 'text-amber-500' : 'text-muted-foreground'}>
              {energy.isRefreshing ? 'YES' : 'NO'}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Is Stale:</span>
            <span className={energy.isStale ? 'text-amber-500' : 'text-green-500'}>
              {energy.isStale ? 'YES' : 'NO'}
            </span>
          </div>

          {user && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">User ID:</span>
              <span className="font-mono text-foreground text-right truncate max-w-32" title={user.id}>
                {user.id.substring(0, 8)}...
              </span>
            </div>
          )}
        </div>
      )}

      {/* Debug Mode Hint */}
      {!isDebugMode && (
        <div className="border-t border-border pt-2 text-muted-foreground text-[10px]">
          Add ?debug=1 to URL for wallet/balance info
        </div>
      )}
    </div>
  );
}

function HandlerStatus({ name, enabled }: { name: string; enabled: boolean }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{name}:</span>
      <span className={enabled ? 'text-green-500 font-semibold' : 'text-destructive font-semibold'}>
        {enabled ? 'ON' : 'OFF'}
      </span>
    </div>
  );
}
