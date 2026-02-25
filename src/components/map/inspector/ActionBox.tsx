import { Undo2, Trash2, AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { PixelIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { PEIcon } from '@/components/ui/pe-icon';
import { OperationProgress } from '../OperationProgress';
import type { GameMode, ValidateResult, ActionError } from '@/hooks/useGameActions';
import { cn } from '@/lib/utils';

interface ActionBoxProps {
  mode: GameMode;
  selectedColor: string | null;
  pixelCount: number;
  pePerPixel: number;
  validationResult: ValidateResult | null;
  onPePerPixelChange: (value: number) => void;
  onColorSelect: (color: string) => void;
  onValidate: () => void;
  onConfirm: () => void;
  onBack?: () => void;
  onExcludeInvalid?: () => void;
  isValidating: boolean;
  isCommitting: boolean;
  isDraftMode?: boolean;
  draftCount?: number;
  onUndoDraft?: () => void;
  onClearDraft?: () => void;
  // Real progress from SSE stream
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

const modeConfig: Record<GameMode, { icon: React.ReactNode; label: string }> = {
  PAINT: { icon: <PixelIcon name="brush" className="h-3.5 w-3.5" />, label: 'Paint' },
  DEFEND: { icon: <PixelIcon name="shield" className="h-3.5 w-3.5" />, label: 'Defend' },
  ATTACK: { icon: <PixelIcon name="swords" className="h-3.5 w-3.5" />, label: 'Attack' },
  REINFORCE: { icon: <PEIcon size="sm" />, label: 'Reinforce' },
  ERASE: { icon: <PixelIcon name="trash" className="h-3.5 w-3.5" />, label: 'Erase' },
  WITHDRAW_DEF: { icon: <PixelIcon name="shield" className="h-3.5 w-3.5" />, label: 'Withdraw DEF' },
  WITHDRAW_ATK: { icon: <PixelIcon name="swords" className="h-3.5 w-3.5" />, label: 'Withdraw ATK' },
  WITHDRAW_REINFORCE: { icon: <PEIcon size="sm" />, label: 'Withdraw Stake' },
};

export function ActionBox({
  mode,
  selectedColor,
  pixelCount,
  pePerPixel,
  validationResult,
  onPePerPixelChange,
  onColorSelect,
  onValidate,
  onConfirm,
  onBack,
  onExcludeInvalid,
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
}: ActionBoxProps) {
  const config = modeConfig[mode];
  
  // Get effective count first (draft for paint, selection for others)
  const effectiveCount = mode === 'PAINT' ? draftCount : pixelCount;
  
  // Check if this is a withdraw mode
  const isWithdraw = mode === 'WITHDRAW_DEF' || mode === 'WITHDRAW_ATK' || mode === 'WITHDRAW_REINFORCE';
  
  // Determine if validation is required:
  // - Always for ERASE (even single pixel)
  // - Always for non-PAINT modes (DEFEND/ATTACK/REINFORCE/WITHDRAW_*)
  // - For PAINT: only if more than 1 pixel
  const needsValidation = mode === 'ERASE' || mode !== 'PAINT' || effectiveCount > 1;

  // Calculate PE values - always use live calculation for DEF/ATK/REINFORCE/WITHDRAW_*
  const requiredPe = (() => {
    // For ERASE, use validation result only
    if (mode === 'ERASE') {
      return validationResult?.requiredPeTotal ?? 0;
    }
    // For PAINT, use draft count or validation
    if (mode === 'PAINT') {
      return validationResult?.requiredPeTotal ?? draftCount;
    }
    // For withdraw modes, show as refund (positive number = PE returned)
    if (isWithdraw) {
      return validationResult?.breakdown?.pePerType?.withdrawRefund ?? pePerPixel * pixelCount;
    }
    // For DEF/ATK/REINFORCE, always compute live from pePerPixel
    return pePerPixel * pixelCount;
  })();
  
  const availablePe = validationResult?.availablePe ?? 0;
  const hasSufficientPe = validationResult ? availablePe >= requiredPe : true;
  
  // PE staleness is tracked by parent via isSelectionChanged prop
  const isValidationStale = false;

  const isValidated = (
    validationResult?.ok === true || 
    validationResult?.partialValid === true ||
    (isWithdraw && validationResult && (validationResult.breakdown?.pePerType?.withdrawRefund ?? 0) > 0)
  ) && !isValidationStale;
  const canConfirm = isValidated && !isCommitting;

  return (
    <div className="border-t border-border p-3 space-y-3 bg-muted/50">
      {/* Header: Mode icon + label + pixel count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-foreground">
            {mode === 'ERASE' ? <PixelIcon name="trash" className="h-3.5 w-3.5" /> : config.icon}
          </div>
          <span className="text-xs font-medium">{config.label}</span>
          {/* Color swatch for PAINT */}
          {mode === 'PAINT' && selectedColor && (
            <>
              <div
                className="h-5 w-5 rounded border border-border"
                style={{ backgroundColor: selectedColor }}
              />
              <span className="text-[10px] font-mono text-muted-foreground">{selectedColor.toUpperCase()}</span>
            </>
          )}
        </div>
        {/* Pixel count badge */}
        {effectiveCount > 0 && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {effectiveCount.toLocaleString()} px
          </span>
        )}
      </div>

      {/* Draft Undo/Clear buttons for PAINT mode */}
      {isDraftMode && mode === 'PAINT' && draftCount > 0 && (
        <div className="flex gap-2 sm:gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            onClick={onUndoDraft}
            disabled={draftCount === 0}
            className="flex-1 h-10 sm:h-7 text-sm sm:text-xs touch-target"
          >
            <Undo2 className="h-4 w-4 sm:h-3 sm:w-3 mr-1.5 sm:mr-1" /> Undo
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClearDraft}
            disabled={draftCount === 0}
            className="flex-1 h-10 sm:h-7 text-sm sm:text-xs text-destructive hover:text-destructive touch-target"
          >
            <Trash2 className="h-4 w-4 sm:h-3 sm:w-3 mr-1.5 sm:mr-1" /> Clear
          </Button>
        </div>
      )}




      {/* Cost Summary - single block */}
      {(validationResult || (mode === 'PAINT' && draftCount > 0) || (mode !== 'PAINT' && mode !== 'ERASE' && pixelCount > 0)) && (
        <div className="space-y-1.5 px-2 py-2 rounded-lg bg-muted/30">
          {/* Required PE */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <PEIcon size="xs" />
              <span>{isWithdraw ? 'Refund' : 'Required'}</span>
            </div>
            <span className={cn("text-base font-semibold tabular-nums", isWithdraw && "text-emerald-500")}>
              {isWithdraw ? '+' : ''}{Math.abs(requiredPe).toLocaleString()}
            </span>
          </div>

          {/* PE Breakdown after validation - explains why cost differs from pixel count */}
          {validationResult && validationResult.breakdown && mode === 'PAINT' && (
            <div className="space-y-0.5 text-[10px] text-muted-foreground border-t border-border/30 pt-1.5 mt-1">
              {validationResult.breakdown.empty > 0 && (
                <div className="flex justify-between">
                  <span>Empty pixels</span>
                  <span className="tabular-nums">{validationResult.breakdown.empty} × 1 PE</span>
                </div>
              )}
              {validationResult.breakdown.ownedByUser > 0 && (
                <div className="flex justify-between text-emerald-500">
                  <span>Your pixels (color only)</span>
                  <span className="tabular-nums">{validationResult.breakdown.ownedByUser} × 0 PE</span>
                </div>
              )}
              {validationResult.breakdown.ownedByOthers > 0 && (
                <div className="flex justify-between text-amber-500">
                  <span>Takeovers</span>
                  <span className="tabular-nums">{validationResult.breakdown.ownedByOthers} px</span>
                </div>
              )}
            </div>
          )}

          {/* Available + After action - only after validation */}
          {validationResult && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">Available</span>
                <span className="text-sm tabular-nums">{availablePe.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-border/50">
                <span className="text-[11px] text-muted-foreground">After action</span>
                <span className={cn(
                  "text-sm font-medium tabular-nums",
                  isWithdraw ? "text-emerald-500" : (hasSufficientPe ? "text-emerald-500" : "text-destructive")
                )}>
                  {isWithdraw 
                    ? (availablePe + Math.abs(requiredPe)).toLocaleString() 
                    : (availablePe - requiredPe).toLocaleString()}
                </span>
              </div>
            </>
          )}

          {/* ERASE refund info */}
          {mode === 'ERASE' && validationResult?.ok && validationResult.unlockPeTotal !== undefined && validationResult.unlockPeTotal > 0 && (
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border/50">
              <span className="text-emerald-500">PE Refund</span>
              <span className="text-emerald-500 font-semibold">+{validationResult.unlockPeTotal.toLocaleString()}</span>
            </div>
          )}
        </div>
      )}

      {/* Inline error area - only shown when InvalidPixelList is NOT handling it */}
      {validationResult && !validationResult.ok && !validationResult.partialValid && !(validationResult.invalidPixels?.length > 0) && (
        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-destructive/10 text-destructive text-[11px]">
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">
            {validationResult.message || validationResult.error || 
             (!hasSufficientPe 
               ? 'Insufficient PE'
               : 'Validation failed')}
          </span>
        </div>
      )}

      {/* Re-validate hint when PE changed */}
      {isValidationStale && (
        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-amber-500/10 text-amber-500 text-[11px]">
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          <span>PE changed — re-validate required</span>
        </div>
      )}

      {/* Selection changed hint - auto-invalidation message */}
      {isSelectionChanged && (
        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-amber-500/10 text-amber-500 text-[11px]">
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          <span>Selection changed — re-validate</span>
        </div>
      )}

      {/* Inline error display with retry button (PROMPT 44) */}
      {lastError && (
        <div className="space-y-2 px-2 py-2 rounded-lg bg-destructive/10 border border-destructive/20">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-destructive">{lastError.message}</p>
            </div>
          </div>
          {lastError.canRetry && onRetryValidate && (
            <Button
              size="sm"
              variant="outline"
              className="w-full h-9"
              onClick={onRetryValidate}
              disabled={isValidating || isCommitting}
            >
              <RefreshCw className="h-3 w-3 mr-1.5" />
              Retry
            </Button>
          )}
        </div>
      )}

      {/* Action Buttons - larger touch targets on mobile */}
      <div className="flex gap-2 sm:gap-1.5">
        {/* Back button - shows after validation to return to draft state */}
        {isValidated && onBack && (
          <Button
            type="button"
            className="rounded-lg h-11 sm:h-8 px-4 sm:px-3 touch-target"
            variant="ghost"
            onClick={onBack}
            disabled={isValidating || isCommitting}
          >
            <ArrowLeft className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
          </Button>
        )}

        {needsValidation && !isValidated && (
          <Button
            className="flex-1 rounded-lg h-11 sm:h-8 text-sm sm:text-xs touch-target"
            variant="outline"
            onClick={onValidate}
            disabled={isValidating || isCommitting || effectiveCount === 0}
          >
          {isValidating 
              ? (effectiveCount > 50 ? `Checking ${effectiveCount} px...` : 'Checking...')
              : 'Validate'
            }
          </Button>
        )}

        {(isValidated || !needsValidation) && (
          <Button
            className="flex-1 rounded-lg h-11 sm:h-8 text-sm sm:text-xs touch-target"
            variant={lastCommitFailed ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={isValidating || isCommitting || (!canConfirm && needsValidation)}
          >
          {(() => {
              const actionLabel = isWithdraw ? 'Withdraw' : (['DEFEND','ATTACK','REINFORCE'].includes(mode) ? 'Deposit' : config.label);
              const actionGerund = isWithdraw ? 'Withdrawing' : (['DEFEND','ATTACK','REINFORCE'].includes(mode) ? 'Depositing' : ({ PAINT: 'Painting', ERASE: 'Erasing' } as Record<string, string>)[mode] || 'Processing');
              if (isCommitting) return `${actionGerund}...`;
              if (lastCommitFailed) return (<><RefreshCw className="h-4 w-4 sm:h-3.5 sm:w-3.5 mr-1.5" /><span>Retry {actionLabel}</span></>);
              return (<>{config.icon}<span className="ml-1.5">{actionLabel}</span></>);
            })()}
          </Button>
        )}
      </div>

      {/* Progress indicator for long operations */}
      <OperationProgress
        isActive={isValidating || isCommitting}
        operation={isValidating ? 'validate' : 'commit'}
        mode={mode}
        progress={progress ?? null}
        isStalled={isStalled}
      />
    </div>
  );
}
