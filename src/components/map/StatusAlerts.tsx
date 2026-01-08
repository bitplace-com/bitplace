import { useState, useCallback } from 'react';
import { Skull, Swords, AlertTriangle, MapPin, X } from 'lucide-react';
import { PEIcon } from '@/components/ui/pe-icon';
import { useStatusAlerts, StatusAlert } from '@/hooks/useStatusAlerts';
import { pixelToLngLat } from '@/lib/coordinates';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

interface StatusAlertsProps {
  userId?: string;
  onJumpToPixel: (x: number, y: number) => void;
}

type AlertCategory = 'lost' | 'under_attack' | 'contested';

function formatRelativeTime(timestamp: string | undefined): string {
  if (!timestamp) return '';
  const now = Date.now();
  const time = new Date(timestamp).getTime();
  const diff = now - time;
  
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function StatusAlerts({ userId, onJumpToPixel }: StatusAlertsProps) {
  const { pixelsLost, pixelsUnderAttack, contestedContributions, markLostAsRead } = useStatusAlerts(userId);
  const [openCategory, setOpenCategory] = useState<AlertCategory | null>(null);

  const handleJump = useCallback((x: number, y: number, alert: StatusAlert) => {
    // Close popover
    setOpenCategory(null);
    
    // Get lng/lat from pixel coords
    const { lng, lat } = pixelToLngLat(x, y);
    
    // Navigate to pixel
    window.dispatchEvent(new CustomEvent('bitplace:navigate', {
      detail: { lat, lng, zoom: 18, pixelX: x, pixelY: y }
    }));
    
    // Open inspector for that pixel
    window.dispatchEvent(new CustomEvent('bitplace:inspect', {
      detail: { x, y }
    }));

    // If it's a "lost" alert, mark the notification as read
    if (alert.category === 'lost' && alert.id) {
      markLostAsRead(alert.id);
    }
  }, [markLostAsRead]);

  const renderAlertList = (alerts: StatusAlert[], emptyMessage: string) => {
    if (alerts.length === 0) {
      return (
        <div className="p-4 text-center text-muted-foreground text-sm">
          {emptyMessage}
        </div>
      );
    }

    return (
      <ScrollArea className="max-h-[200px]">
        <div className="divide-y divide-border/50">
          {alerts.map((alert) => (
            <div 
              key={alert.id} 
              className="flex items-center justify-between gap-2 p-2 hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="text-xs font-mono text-foreground">
                  ({alert.x.toLocaleString()}, {alert.y.toLocaleString()})
                </div>
                {alert.details?.atkTotal && (
                  <div className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    ATK: {alert.details.atkTotal} <PEIcon size="xs" />
                  </div>
                )}
                {alert.details?.side && (
                  <div className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    Your {alert.details.side} · ATK: {alert.details.atkTotal} / DEF: {alert.details.defTotal} <PEIcon size="xs" />
                  </div>
                )}
                {alert.timestamp && (
                  <div className="text-[10px] text-muted-foreground">
                    {formatRelativeTime(alert.timestamp)}
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleJump(alert.x, alert.y, alert)}
                className="h-7 px-2 text-xs gap-1"
              >
                <MapPin className="h-3 w-3" />
                Jump
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
    );
  };

  // Don't render if no alerts
  if (pixelsLost.length === 0 && pixelsUnderAttack.length === 0 && contestedContributions.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5">
      {/* Pixels Lost */}
      {pixelsLost.length > 0 && (
        <Popover open={openCategory === 'lost'} onOpenChange={(open) => setOpenCategory(open ? 'lost' : null)}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all",
                "bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-400",
                "hover:bg-red-500/25 hover:border-red-500/50"
              )}
            >
              <Skull className="h-3.5 w-3.5" />
              <span>Lost: {pixelsLost.length}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent 
            side="top" 
            align="start" 
            className="w-64 p-0 glass-panel"
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
              <span className="text-xs font-medium text-foreground">Pixels Lost</span>
              <button 
                onClick={() => setOpenCategory(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            {renderAlertList(pixelsLost, 'No pixels lost')}
          </PopoverContent>
        </Popover>
      )}

      {/* Under Attack */}
      {pixelsUnderAttack.length > 0 && (
        <Popover open={openCategory === 'under_attack'} onOpenChange={(open) => setOpenCategory(open ? 'under_attack' : null)}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all",
                "bg-orange-500/15 border border-orange-500/30 text-orange-600 dark:text-orange-400",
                "hover:bg-orange-500/25 hover:border-orange-500/50"
              )}
            >
              <Swords className="h-3.5 w-3.5" />
              <span>Under attack: {pixelsUnderAttack.length}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent 
            side="top" 
            align="start" 
            className="w-64 p-0 glass-panel"
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
              <span className="text-xs font-medium text-foreground">Pixels Under Attack</span>
              <button 
                onClick={() => setOpenCategory(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            {renderAlertList(pixelsUnderAttack, 'No pixels under attack')}
          </PopoverContent>
        </Popover>
      )}

      {/* Contested */}
      {contestedContributions.length > 0 && (
        <Popover open={openCategory === 'contested'} onOpenChange={(open) => setOpenCategory(open ? 'contested' : null)}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all",
                "bg-yellow-500/15 border border-yellow-500/30 text-yellow-600 dark:text-yellow-400",
                "hover:bg-yellow-500/25 hover:border-yellow-500/50"
              )}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Contested: {contestedContributions.length}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent 
            side="top" 
            align="start" 
            className="w-64 p-0 glass-panel"
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
              <span className="text-xs font-medium text-foreground">Contested Contributions</span>
              <button 
                onClick={() => setOpenCategory(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            {renderAlertList(contestedContributions, 'No contested contributions')}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
