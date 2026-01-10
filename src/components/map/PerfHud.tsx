import { useEffect, useState } from 'react';
import { getMetrics, isDebugMode } from '@/lib/perfMetrics';

interface PerfHudProps {
  className?: string;
}

export function PerfHud({ className }: PerfHudProps) {
  const [metrics, setMetrics] = useState(getMetrics());
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isDebugMode()) return;
    setVisible(true);
    
    // Update metrics every 500ms
    const interval = setInterval(() => {
      setMetrics(getMetrics());
    }, 500);
    
    return () => clearInterval(interval);
  }, []);

  if (!visible) return null;

  return (
    <div 
      className={`fixed top-2 left-2 z-[9999] bg-black/80 text-green-400 font-mono text-[10px] p-2 rounded pointer-events-none ${className}`}
    >
      <div className="font-bold text-green-300 mb-1">PERF HUD</div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
        <span className="text-green-500/70">TTFP:</span>
        <span>{metrics.ttfp !== null ? `${metrics.ttfp.toFixed(0)}ms` : '—'}</span>
        
        <span className="text-green-500/70">Last Fetch:</span>
        <span>{metrics.lastFetchMs !== null ? `${metrics.lastFetchMs.toFixed(0)}ms` : '—'}</span>
        
        <span className="text-green-500/70">Last Draw:</span>
        <span>{metrics.lastDrawMs !== null ? `${metrics.lastDrawMs.toFixed(1)}ms` : '—'}</span>
        
        <span className="text-green-500/70">Visible Tiles:</span>
        <span>{metrics.visibleTileCount}</span>
        
        <span className="text-green-500/70">Cached Tiles:</span>
        <span>{metrics.cachedTileCount}</span>
      </div>
    </div>
  );
}
