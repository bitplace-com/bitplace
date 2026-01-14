import { useState, useEffect, useCallback } from 'react';
import { PixelIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CollapsedActionBar } from './CollapsedActionBar';
import { ActionBox } from './inspector/ActionBox';
import { InvalidPixelList } from './inspector/InvalidPixelList';
import { MAX_SELECTION_PIXELS } from './hooks/useSelection';
import { supabase } from '@/integrations/supabase/client';
import { useWithdrawContribution } from '@/hooks/useWithdrawContribution';
import { cn } from '@/lib/utils';
import type { GameMode, ValidateResult, InvalidPixel, ActionError } from '@/hooks/useGameActions';

type DockState = 'hidden' | 'collapsed' | 'expanded';

interface WithdrawStats {
  myDefTotal: number;
  myAtkTotal: number;
  defPixelCount: number;
  atkPixelCount: number;
}

interface MobileActionDockProps {
  selectedPixels: { x: number; y: number }[];
  mode: GameMode;
  selectedColor: string | null;
  currentUserId?: string;
  validationResult: ValidateResult | null;
  invalidPixels: InvalidPixel[];
  pePerPixel: number;
  onPePerPixelChange: (value: number) => void;
  onColorSelect: (color: string) => void;
  onValidate: () => void;
  onConfirm: () => void;
  onClearSelection: () => void;
  onBack?: () => void;
  onExcludeInvalid?: () => void;
  clearValidation?: () => void;
  isValidating: boolean;
  isCommitting: boolean;
  // Draft-specific props
  isDraftMode?: boolean;
  draftCount?: number;
  onUndoDraft?: () => void;
  onClearDraft?: () => void;
  // Progress tracking
  progress?: { processed: number; total: number } | null;
  // Stall detection
  isStalled?: boolean;
  // State machine hints
  isSelectionChanged?: boolean;
  lastCommitFailed?: boolean;
  // Inline error display (PROMPT 44)
  lastError?: ActionError | null;
  onRetryValidate?: () => void;
}

export function MobileActionDock({
  selectedPixels,
  mode,
  selectedColor,
  currentUserId,
  validationResult,
  invalidPixels,
  pePerPixel,
  onPePerPixelChange,
  onColorSelect,
  onValidate,
  onConfirm,
  onClearSelection,
  onBack,
  onExcludeInvalid,
  clearValidation,
  isValidating,
  isCommitting,
  isDraftMode = false,
  draftCount = 0,
  onUndoDraft,
  onClearDraft,
  progress,
  isStalled = false,
  isSelectionChanged = false,
  lastCommitFailed = false,
  lastError,
  onRetryValidate,
}: MobileActionDockProps) {
  const [dockState, setDockState] = useState<DockState>('hidden');
  const [withdrawStats, setWithdrawStats] = useState<WithdrawStats | null>(null);
  const [isLoadingWithdrawStats, setIsLoadingWithdrawStats] = useState(false);
  const [withdrawingSide, setWithdrawingSide] = useState<'DEF' | 'ATK' | null>(null);
  const { commit: withdrawCommit, isCommitting: isWithdrawCommitting } = useWithdrawContribution();

  const hasContent = selectedPixels.length > 0 || draftCount > 0;
  const effectiveCount = isDraftMode ? draftCount : selectedPixels.length;
  const isSelectionTooLarge = selectedPixels.length > MAX_SELECTION_PIXELS;

  // Calculate required PE for collapsed bar display
  const requiredPe = (() => {
    if (mode === 'ERASE') return validationResult?.requiredPeTotal ?? 0;
    if (mode === 'PAINT') return validationResult?.requiredPeTotal ?? draftCount;
    return pePerPixel * selectedPixels.length;
  })();

  // Auto-show collapsed when content appears, hide when content disappears
  useEffect(() => {
    if (hasContent && dockState === 'hidden') {
      setDockState('collapsed');
    } else if (!hasContent && dockState !== 'hidden') {
      setDockState('hidden');
    }
  }, [hasContent, dockState]);

  // Fetch withdraw stats when selection changes
  const fetchWithdrawStats = useCallback(async () => {
    if (!currentUserId || selectedPixels.length === 0) {
      setWithdrawStats(null);
      return;
    }

    setIsLoadingWithdrawStats(true);
    try {
      const orCondition = selectedPixels
        .map(p => `and(x.eq.${p.x},y.eq.${p.y})`)
        .join(',');

      const { data: pixels, error: pixelError } = await supabase
        .from('pixels')
        .select('id')
        .or(orCondition);

      if (pixelError || !pixels || pixels.length === 0) {
        setWithdrawStats(null);
        return;
      }

      const pixelIds = pixels.map(p => p.id);

      const { data: contributions, error: contribError } = await supabase
        .from('pixel_contributions')
        .select('pixel_id, amount_pe, side')
        .eq('user_id', currentUserId)
        .in('pixel_id', pixelIds);

      if (contribError) {
        setWithdrawStats(null);
        return;
      }

      let myDefTotal = 0;
      let myAtkTotal = 0;
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

      setWithdrawStats({
        myDefTotal,
        myAtkTotal,
        defPixelCount: defPixelIds.size,
        atkPixelCount: atkPixelIds.size,
      });
    } catch (error) {
      console.error('[MobileActionDock] Error fetching withdraw stats:', error);
      setWithdrawStats(null);
    } finally {
      setIsLoadingWithdrawStats(false);
    }
  }, [selectedPixels, currentUserId]);

  useEffect(() => {
    fetchWithdrawStats();
  }, [fetchWithdrawStats]);

  const handleWithdraw = async (side: 'DEF' | 'ATK') => {
    setWithdrawingSide(side);
    try {
      const result = await withdrawCommit(selectedPixels, side);
      if (result?.ok) {
        await fetchWithdrawStats();
      }
    } finally {
      setWithdrawingSide(null);
    }
  };

  // X button handler - cancels everything
  const handleCancel = useCallback(() => {
    if (draftCount > 0 && onClearDraft) {
      onClearDraft();
    } else {
      onClearSelection();
    }
    clearValidation?.();
    setDockState('hidden');
  }, [draftCount, onClearDraft, onClearSelection, clearValidation]);

  // Collapse handler - just collapses, keeps draft/selection
  const handleCollapse = useCallback(() => {
    setDockState('collapsed');
  }, []);

  // Expand handler
  const handleExpand = useCallback(() => {
    setDockState('expanded');
  }, []);

  const hasWithdrawableContributions = withdrawStats && 
    (withdrawStats.myDefTotal > 0 || withdrawStats.myAtkTotal > 0);

  if (dockState === 'hidden') {
    return null;
  }

  return (
    <div 
      className="fixed inset-x-0 z-40 pointer-events-none"
      style={{ 
        bottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))'
      }}
    >
      <div className="mx-auto max-w-lg px-2 pointer-events-auto">
        {dockState === 'collapsed' ? (
          <CollapsedActionBar
            mode={mode}
            pixelCount={effectiveCount}
            requiredPe={requiredPe}
            selectedColor={selectedColor}
            onExpand={handleExpand}
            isProcessing={isValidating || isCommitting}
          />
        ) : (
          <div className="glass-hud rounded-xl border border-border/50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/20">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {effectiveCount.toLocaleString()} pixel{effectiveCount !== 1 ? 's' : ''}
                </span>
                <span className="text-xs text-muted-foreground">selected</span>
              </div>
              <div className="flex items-center gap-1">
                {/* Collapse button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-lg"
                  onClick={handleCollapse}
                  title="Collapse"
                >
                  <PixelIcon name="chevronDown" className="h-5 w-5" />
                </Button>
                {/* Cancel button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                  onClick={handleCancel}
                  title="Cancel"
                >
                  <PixelIcon name="close" className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Scrollable content */}
            <ScrollArea className="max-h-[50vh]">
              {isSelectionTooLarge ? (
                <div className="flex flex-col items-center justify-center p-6 gap-3">
                  <p className="text-sm font-medium text-foreground">Selection too large</p>
                  <p className="text-xs text-muted-foreground">
                    Max: {MAX_SELECTION_PIXELS.toLocaleString()} pixels
                  </p>
                  <Button size="sm" variant="outline" onClick={handleCancel} className="mt-2">
                    Clear Selection
                  </Button>
                </div>
              ) : (
                <>
                  {/* Invalid Pixels List */}
                  {invalidPixels.length > 0 && (
                    <InvalidPixelList 
                      invalidPixels={invalidPixels} 
                      onExcludeInvalid={onExcludeInvalid}
                      isPartialValid={validationResult?.partialValid}
                    />
                  )}

                  {/* Withdraw Section */}
                  {hasWithdrawableContributions && (
                    <div className="border-t border-border/20 p-3 space-y-2">
                      <div className="text-xs font-medium text-muted-foreground">Withdraw Contributions</div>
                      
                      {withdrawStats.myDefTotal > 0 && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="w-full justify-between h-11 text-foreground"
                          onClick={() => handleWithdraw('DEF')}
                          disabled={isWithdrawCommitting || withdrawingSide !== null}
                        >
                          <div className="flex items-center gap-1.5">
                            {withdrawingSide === 'DEF' ? (
                              <PixelIcon name="loader" className="h-4 w-4 animate-spin" />
                            ) : (
                              <PixelIcon name="shield" className="h-4 w-4 text-emerald-500" />
                            )}
                            <span className="text-foreground">Withdraw DEF</span>
                            <span className="text-muted-foreground text-xs">({withdrawStats.defPixelCount} px)</span>
                          </div>
                          <span className="text-emerald-500 font-semibold">+{withdrawStats.myDefTotal.toLocaleString()} PE</span>
                        </Button>
                      )}
                      
                      {withdrawStats.myAtkTotal > 0 && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="w-full justify-between h-11 text-foreground"
                          onClick={() => handleWithdraw('ATK')}
                          disabled={isWithdrawCommitting || withdrawingSide !== null}
                        >
                          <div className="flex items-center gap-1.5">
                            {withdrawingSide === 'ATK' ? (
                              <PixelIcon name="loader" className="h-4 w-4 animate-spin" />
                            ) : (
                              <PixelIcon name="swords" className="h-4 w-4 text-rose-500" />
                            )}
                            <span className="text-foreground">Withdraw ATK</span>
                            <span className="text-muted-foreground text-xs">({withdrawStats.atkPixelCount} px)</span>
                          </div>
                          <span className="text-rose-500 font-semibold">+{withdrawStats.myAtkTotal.toLocaleString()} PE</span>
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Action Box */}
                  <ActionBox
                    mode={mode}
                    selectedColor={selectedColor}
                    pixelCount={selectedPixels.length}
                    pePerPixel={pePerPixel}
                    validationResult={validationResult}
                    onPePerPixelChange={onPePerPixelChange}
                    onColorSelect={onColorSelect}
                    onValidate={onValidate}
                    onConfirm={onConfirm}
                    onBack={onBack}
                    onExcludeInvalid={onExcludeInvalid}
                    isValidating={isValidating}
                    isCommitting={isCommitting}
                    isDraftMode={isDraftMode}
                    draftCount={draftCount}
                    onUndoDraft={onUndoDraft}
                    onClearDraft={onClearDraft}
                    progress={progress}
                    isStalled={isStalled}
                    isSelectionChanged={isSelectionChanged}
                    lastCommitFailed={lastCommitFailed}
                    lastError={lastError}
                    onRetryValidate={onRetryValidate}
                  />
                </>
              )}
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}
