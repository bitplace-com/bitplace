import { Paintbrush, Shield, Swords, Loader2, Eraser, Undo2, Trash2, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PEIcon } from '@/components/ui/pe-icon';
import { PeInput } from '../PeInput';
import type { GameMode, ValidateResult } from '@/hooks/useGameActions';
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
  isValidating: boolean;
  isCommitting: boolean;
  // Draft-specific props
  isDraftMode?: boolean;
  draftCount?: number;
  onUndoDraft?: () => void;
  onClearDraft?: () => void;
}

const modeConfig: Record<GameMode, { icon: React.ReactNode; label: string }> = {
  PAINT: { icon: <Paintbrush className="h-3.5 w-3.5" />, label: 'Paint' },
  DEFEND: { icon: <Shield className="h-3.5 w-3.5" />, label: 'Defend' },
  ATTACK: { icon: <Swords className="h-3.5 w-3.5" />, label: 'Attack' },
  REINFORCE: { icon: <PEIcon size="sm" />, label: 'Reinforce' },
  ERASE: { icon: <Eraser className="h-3.5 w-3.5" />, label: 'Erase' },
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
  isValidating,
  isCommitting,
  isDraftMode = false,
  draftCount = 0,
  onUndoDraft,
  onClearDraft,
}: ActionBoxProps) {
  const config = modeConfig[mode];
  const needsValidation = mode === 'ERASE' || mode !== 'PAINT' || pixelCount > 1;

  // Calculate PE values - always use live calculation for DEF/ATK/REINFORCE
  const requiredPe = (() => {
    // For ERASE, use validation result only
    if (mode === 'ERASE') {
      return validationResult?.requiredPeTotal ?? 0;
    }
    // For PAINT, use draft count or validation
    if (mode === 'PAINT') {
      return validationResult?.requiredPeTotal ?? draftCount;
    }
    // For DEF/ATK/REINFORCE, always compute live from pePerPixel
    return pePerPixel * pixelCount;
  })();
  
  const availablePe = validationResult?.availablePe ?? 0;
  const hasSufficientPe = validationResult ? availablePe >= requiredPe : true;
  
  // Check if PE per pixel changed after validation (requires re-validate)
  const isValidationStale = validationResult && 
    mode !== 'PAINT' && 
    mode !== 'ERASE' && 
    validationResult.requiredPeTotal !== pePerPixel * pixelCount;

  const isValidated = validationResult?.ok === true && !isValidationStale;
  const canConfirm = isValidated && !isCommitting;

  return (
    <div className="border-t border-border p-3 space-y-3 bg-muted/50">
      {/* Mode + Color inline for PAINT/ERASE */}
      {(mode === 'PAINT' || mode === 'ERASE') ? (
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-foreground">
            {mode === 'ERASE' ? <Eraser className="h-3.5 w-3.5" /> : config.icon}
          </div>
          {mode === 'ERASE' ? (
            <span className="text-[11px] font-mono text-muted-foreground">ERASER</span>
          ) : selectedColor ? (
            <>
              <div
                className="h-6 w-6 rounded-md border border-white/20"
                style={{ backgroundColor: selectedColor }}
              />
              <span className="text-[11px] font-mono text-muted-foreground">{selectedColor.toUpperCase()}</span>
            </>
          ) : (
            <span className="text-[11px] font-mono text-muted-foreground">ERASER</span>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-foreground">
            {config.icon}
          </div>
          <span className="text-xs font-medium">{config.label}</span>
        </div>
      )}

      {/* Draft Undo/Clear buttons for PAINT mode */}
      {isDraftMode && mode === 'PAINT' && draftCount > 0 && (
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            onClick={onUndoDraft}
            disabled={draftCount === 0}
            className="flex-1 h-7 text-xs"
          >
            <Undo2 className="h-3 w-3 mr-1" /> Undo
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClearDraft}
            disabled={draftCount === 0}
            className="flex-1 h-7 text-xs text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3 w-3 mr-1" /> Clear
          </Button>
        </div>
      )}

      {/* Draft count for PAINT mode */}
      {isDraftMode && mode === 'PAINT' && draftCount > 0 && (
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">Draft</span>
          <span className="font-medium text-foreground">{draftCount.toLocaleString()} px</span>
        </div>
      )}

      {/* PE Input for non-PAINT/ERASE modes */}
      {mode !== 'PAINT' && mode !== 'ERASE' && (
        <PeInput 
          value={pePerPixel} 
          onChange={onPePerPixelChange} 
          pixelCount={pixelCount}
        />
      )}

      {/* PE Summary - clean structure */}
      {(validationResult || (isDraftMode && draftCount > 0) || (mode !== 'PAINT' && mode !== 'ERASE' && pixelCount > 0)) && (
        <div className="space-y-1.5 px-2 py-2 rounded-lg bg-muted/30">
          {/* Required PE */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <PEIcon size="xs" />
              <span>Required</span>
            </div>
            <span className="text-base font-semibold tabular-nums">
              {requiredPe.toLocaleString()}
            </span>
          </div>

          {/* Available PE - only show after validation */}
          {validationResult && (
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">Available</span>
              <span className={cn(
                "text-sm font-medium tabular-nums",
                hasSufficientPe ? "text-emerald-500" : "text-destructive"
              )}>
                {availablePe.toLocaleString()}
              </span>
            </div>
          )}

          {/* Result message */}
          {validationResult && (
            <div className={cn(
              "flex items-center gap-1.5 text-[11px] pt-1 border-t border-border/50",
              validationResult.ok ? "text-emerald-500" : "text-destructive"
            )}>
              {validationResult.ok && !isValidationStale ? (
                <>
                  <Check className="h-3 w-3" />
                  <span>Ready to commit</span>
                </>
              ) : isValidationStale ? (
                <>
                  <AlertCircle className="h-3 w-3 text-amber-500" />
                  <span className="text-amber-500">PE changed — re-validate required</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-3 w-3" />
                  <span>
                    {validationResult.invalidPixels?.length > 0 
                      ? `${validationResult.invalidPixels.length} invalid pixel(s)`
                      : !hasSufficientPe 
                        ? 'Insufficient PE'
                        : 'Validation failed'}
                  </span>
                </>
              )}
            </div>
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

      {/* Action Buttons */}
      <div className="flex gap-1.5">
        {needsValidation && !isValidated && (
          <Button
            className="flex-1 rounded-lg h-8 text-xs"
            variant="secondary"
            onClick={onValidate}
            disabled={isValidating}
          >
            {isValidating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Checking...
              </>
            ) : (
              'Validate'
            )}
          </Button>
        )}

        {(isValidated || !needsValidation) && (
          <Button
            className="flex-1 rounded-lg h-8 text-xs"
            onClick={onConfirm}
            disabled={!canConfirm && needsValidation}
          >
            {isCommitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ...
              </>
            ) : (
              <>
                {config.icon}
                <span className="ml-1.5">{config.label}</span>
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
