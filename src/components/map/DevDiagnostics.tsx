import { useEffect, useState } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { X, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DevDiagnosticsProps {
  map: MapLibreMap | null;
  zoom: number;
  canPaint: boolean;
  isSelecting: boolean;
}

export function DevDiagnostics({ map, zoom, canPaint, isSelecting }: DevDiagnosticsProps) {
  const [visible, setVisible] = useState(false);
  const [center, setCenter] = useState<{ lng: number; lat: number }>({ lng: 0, lat: 0 });
  const [handlers, setHandlers] = useState({
    scrollZoom: false,
    dragPan: false,
    doubleClickZoom: false,
    touchZoomRotate: false,
  });

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

  if (!visible) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setVisible(true)}
        className="absolute top-4 left-4 z-50 bg-secondary/95 backdrop-blur-sm border border-border h-8 w-8"
        title="Open Dev Diagnostics"
      >
        <Bug className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <div className="absolute top-4 left-4 z-50 bg-secondary/95 backdrop-blur-sm border border-border rounded-lg p-3 text-xs space-y-2 min-w-52 shadow-lg">
      <div className="flex justify-between items-center border-b border-border pb-2">
        <span className="font-semibold text-foreground flex items-center gap-1.5">
          <Bug className="h-3.5 w-3.5" />
          Dev Diagnostics
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setVisible(false)}
          className="h-5 w-5 p-0"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      <div className="space-y-1 text-muted-foreground">
        <div className="flex justify-between">
          <span>Zoom:</span>
          <span className="font-mono text-foreground">{zoom.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Center:</span>
          <span className="font-mono text-foreground">
            {center.lng.toFixed(4)}, {center.lat.toFixed(4)}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Can Paint:</span>
          <span className={canPaint ? 'text-green-600 font-semibold' : 'text-muted-foreground'}>
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

      <div className="border-t border-border pt-2 space-y-1">
        <div className="text-muted-foreground font-medium mb-1">Map Handlers</div>
        <HandlerStatus name="scrollZoom" enabled={handlers.scrollZoom} />
        <HandlerStatus name="dragPan" enabled={handlers.dragPan} />
        <HandlerStatus name="doubleClickZoom" enabled={handlers.doubleClickZoom} />
        <HandlerStatus name="touchZoomRotate" enabled={handlers.touchZoomRotate} />
      </div>
    </div>
  );
}

function HandlerStatus({ name, enabled }: { name: string; enabled: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{name}:</span>
      <span className={enabled ? 'text-green-600 font-semibold' : 'text-destructive font-semibold'}>
        {enabled ? 'ON' : 'OFF'}
      </span>
    </div>
  );
}
