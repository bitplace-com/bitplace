import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { GlassPanel } from '@/components/ui/glass-panel';
import { PixelIcon } from '@/components/icons';
import { PEIcon } from '@/components/ui/pe-icon';
import { supabase } from '@/integrations/supabase/client';
import { useWithdrawContribution } from '@/hooks/useWithdrawContribution';
import { cn } from '@/lib/utils';

const PE_TO_USD = 0.001;

interface AggregatedStats {
  myDefTotal: number;
  myAtkTotal: number;
  myOwnedCount: number;
  myOwnerStake: number;
  defPixelCount: number;
  atkPixelCount: number;
}

interface InspectSelectionPanelProps {
  selectedPixels: { x: number; y: number }[];
  currentUserId?: string;
  onClearSelection: () => void;
}

export function InspectSelectionPanel({ 
  selectedPixels, 
  currentUserId, 
  onClearSelection 
}: InspectSelectionPanelProps) {
  const [aggregatedStats, setAggregatedStats] = useState<AggregatedStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [withdrawingSide, setWithdrawingSide] = useState<'DEF' | 'ATK' | null>(null);
  const { commit, isCommitting } = useWithdrawContribution();

  // Fetch aggregated stats for all selected pixels
  const fetchAggregatedStats = useCallback(async () => {
    if (!currentUserId || selectedPixels.length === 0) {
      setAggregatedStats(null);
      return;
    }

    setIsLoading(true);
    try {
      const orCondition = selectedPixels
        .map(p => `and(x.eq.${p.x},y.eq.${p.y})`)
        .join(',');

      const { data: pixels, error: pixelError } = await supabase
        .from('pixels')
        .select('id, x, y, owner_user_id, owner_stake_pe')
        .or(orCondition);

      if (pixelError) {
        console.error('[InspectSelectionPanel] Error fetching pixels:', pixelError);
        return;
      }

      const pixelIds = pixels?.map(p => p.id) || [];
      
      if (pixelIds.length === 0) {
        setAggregatedStats({
          myDefTotal: 0, myAtkTotal: 0, myOwnedCount: 0,
          myOwnerStake: 0, defPixelCount: 0, atkPixelCount: 0,
        });
        return;
      }

      const { data: contributions, error: contribError } = await supabase
        .from('pixel_contributions')
        .select('pixel_id, amount_pe, side')
        .eq('user_id', currentUserId)
        .in('pixel_id', pixelIds);

      if (contribError) {
        console.error('[InspectSelectionPanel] Error fetching contributions:', contribError);
        return;
      }

      let myDefTotal = 0;
      let myAtkTotal = 0;
      let myOwnedCount = 0;
      let myOwnerStake = 0;
      const defPixelIds = new Set<number>();
      const atkPixelIds = new Set<number>();

      contributions?.forEach(c => {
        if (c.side === 'DEF') {
          myDefTotal += Number(c.amount_pe);
          defPixelIds.add(c.pixel_id);
        } else if (c.side === 'ATK') {
          myAtkTotal += Number(c.amount_pe);
          atkPixelIds.add(c.pixel_id);
        }
      });

      pixels?.forEach(p => {
        if (p.owner_user_id === currentUserId) {
          myOwnedCount++;
          myOwnerStake += Number(p.owner_stake_pe);
        }
      });

      setAggregatedStats({
        myDefTotal, myAtkTotal, myOwnedCount, myOwnerStake,
        defPixelCount: defPixelIds.size, atkPixelCount: atkPixelIds.size,
      });
    } catch (error) {
      console.error('[InspectSelectionPanel] Error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedPixels, currentUserId]);

  useEffect(() => {
    fetchAggregatedStats();
  }, [fetchAggregatedStats]);

  const handleBatchWithdraw = async (side: 'DEF' | 'ATK') => {
    setWithdrawingSide(side);
    try {
      const result = await commit(selectedPixels, side);
      if (result?.ok) {
        await fetchAggregatedStats();
      }
    } finally {
      setWithdrawingSide(null);
    }
  };

  const formatUsd = (pe: number) => {
    const usd = pe * PE_TO_USD;
    return usd < 0.01 ? `$${usd.toFixed(3)}` : `$${usd.toFixed(2)}`;
  };

  const hasAnyContributions = aggregatedStats && 
    (aggregatedStats.myDefTotal > 0 || aggregatedStats.myAtkTotal > 0);

  return (
    <GlassPanel className="w-72 max-h-96 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{selectedPixels.length} pixels</span>
          <span className="text-xs text-muted-foreground">selected</span>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6"
          onClick={onClearSelection}
        >
          <PixelIcon name="close" size="xs" />
        </Button>
      </div>

      {/* Content */}
      <div className="p-3 space-y-3 overflow-y-auto flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <PixelIcon name="loader" size="md" className="animate-spin text-muted-foreground" />
          </div>
        ) : aggregatedStats ? (
          <>
            {/* Your Contributions */}
            {hasAnyContributions && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 space-y-3">
                <div className="text-xs font-medium text-foreground">Your Contributions</div>
                
                {/* DEF Row */}
                {aggregatedStats.myDefTotal > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <PixelIcon name="shield" size="sm" className="text-emerald-400" />
                        <span className="text-sm">
                          {aggregatedStats.myDefTotal.toLocaleString()} PE
                        </span>
                        <span className="text-xs text-emerald-500 font-medium">
                          {formatUsd(aggregatedStats.myDefTotal)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({aggregatedStats.defPixelCount} px)
                        </span>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="w-full"
                      onClick={() => handleBatchWithdraw('DEF')}
                      disabled={isCommitting || withdrawingSide !== null}
                    >
                      {withdrawingSide === 'DEF' ? (
                        <PixelIcon name="loader" size="xs" className="mr-1.5 animate-spin" />
                      ) : (
                        <PixelIcon name="shield" size="xs" className="mr-1.5" />
                      )}
                      Withdraw DEF • +{aggregatedStats.myDefTotal.toLocaleString()} PE
                    </Button>
                  </div>
                )}
                
                {/* ATK Row */}
                {aggregatedStats.myAtkTotal > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <PixelIcon name="swords" size="sm" className="text-rose-400" />
                        <span className="text-sm">
                          {aggregatedStats.myAtkTotal.toLocaleString()} PE
                        </span>
                        <span className="text-xs text-emerald-500 font-medium">
                          {formatUsd(aggregatedStats.myAtkTotal)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({aggregatedStats.atkPixelCount} px)
                        </span>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="w-full"
                      onClick={() => handleBatchWithdraw('ATK')}
                      disabled={isCommitting || withdrawingSide !== null}
                    >
                      {withdrawingSide === 'ATK' ? (
                        <PixelIcon name="loader" size="xs" className="mr-1.5 animate-spin" />
                      ) : (
                        <PixelIcon name="swords" size="xs" className="mr-1.5" />
                      )}
                      Withdraw ATK • +{aggregatedStats.myAtkTotal.toLocaleString()} PE
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* My Owned Pixels */}
            {aggregatedStats.myOwnedCount > 0 && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <PixelIcon name="user" size="xs" />
                  <span>Owned by you</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold">
                    {aggregatedStats.myOwnedCount}
                  </span>
                  <span className="text-sm text-muted-foreground">pixels</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <PEIcon size="xs" />
                  <span>{aggregatedStats.myOwnerStake.toLocaleString()} PE staked</span>
                  <span className="text-emerald-500 font-medium">{formatUsd(aggregatedStats.myOwnerStake)}</span>
                </div>
              </div>
            )}

            {/* No contributions message */}
            {!hasAnyContributions && aggregatedStats.myOwnedCount === 0 && (
              <div className="text-center text-muted-foreground py-4 text-sm">
                No contributions on selected pixels
              </div>
            )}
          </>
        ) : (
          <div className="text-center text-muted-foreground py-4 text-sm">
            Select pixels to view stats
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-border/50">
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full text-xs"
          onClick={onClearSelection}
        >
          Clear Selection
        </Button>
      </div>
    </GlassPanel>
  );
}
