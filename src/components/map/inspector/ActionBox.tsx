import { Paintbrush, Shield, Swords, Zap, Loader2, Eraser, Undo2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  REINFORCE: { icon: <Zap className="h-3.5 w-3.5" />, label: 'Reinforce' },
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
  // ERASE always requires validation to confirm which pixels will be erased
  const needsValidation = mode === 'ERASE' || mode !== 'PAINT' || pixelCount > 1;
  const isValidated = validationResult?.ok === true;
  // ERASE and non-PAINT modes require validation before confirm
  const canConfirm = isValidated && !isCommitting;

  // Extract breakdown for display
  const breakdown = validationResult?.breakdown;
  const hasBreakdown = breakdown && validationResult?.ok;

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

      {/* Draft info for PAINT mode */}
      {isDraftMode && mode === 'PAINT' && draftCount > 0 && (
        <div className="text-[10px] text-muted-foreground px-1">
          Minimum: <span className="font-medium text-foreground">{draftCount} PE</span> (1 PE per empty pixel)
        </div>
      )}

      {/* PE Input for non-PAINT/ERASE modes */}
      {mode !== 'PAINT' && mode !== 'ERASE' && (
        <div className="space-y-1.5">
          <PeInput 
            value={pePerPixel} 
            onChange={onPePerPixelChange} 
            pixelCount={pixelCount}
          />
          <div className="text-[10px] text-muted-foreground">
            Total: <span className="font-medium text-foreground">{(pePerPixel * pixelCount).toLocaleString()} PE</span> × {pixelCount}px
          </div>
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

      {/* Validation Status - Invalid pixels */}
      {validationResult && !validationResult.ok && (
        <div className="text-[10px] text-destructive bg-destructive/10 px-2 py-1.5 rounded-md">
          {validationResult.invalidPixels.length} invalid pixel(s)
        </div>
      )}

      {/* PE Cost Summary (shown for all modes when validated successfully) */}
      {hasBreakdown && (
        <div className="text-[10px] space-y-1 px-2 py-1.5 rounded-md bg-muted/50">
          {mode === 'PAINT' ? (
            <>
              <div className="text-muted-foreground font-medium mb-1">This action will lock:</div>
              {breakdown.empty > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">New pixels ({breakdown.empty}):</span>
                  <span className="text-foreground font-medium">{breakdown.empty} PE</span>
                </div>
              )}
              {breakdown.ownedByUser > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Recolor yours ({breakdown.ownedByUser}):</span>
                  <span className="font-medium">0 PE</span>
                </div>
              )}
              {breakdown.ownedByOthers > 0 && (
                <div className="flex justify-between text-amber-400">
                  <span>Takeover ({breakdown.ownedByOthers}):</span>
                  <span className="font-medium">{breakdown.pePerType?.takeover || breakdown.ownedByOthers}+ PE</span>
                </div>
              )}
            </>
          ) : mode === 'ERASE' ? (
            <div className="space-y-1">
              <div className="text-muted-foreground">
                Erasing <span className="text-amber-400 font-medium">{breakdown.ownedByUser}</span> owned pixel(s).
              </div>
              {validationResult?.unlockPeTotal !== undefined && validationResult.unlockPeTotal > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>PE Refund:</span>
                  <span className="font-bold">+{validationResult.unlockPeTotal.toLocaleString()} PE</span>
                </div>
              )}
            </div>
          ) : mode === 'DEFEND' ? (
            <div className="text-muted-foreground">
              Adding <span className="text-emerald-400 font-medium">{pePerPixel} PE</span> defense to {pixelCount} pixel(s)
            </div>
          ) : mode === 'ATTACK' ? (
            <div className="text-muted-foreground">
              Adding <span className="text-rose-400 font-medium">{pePerPixel} PE</span> attack to {pixelCount} pixel(s)
            </div>
          ) : mode === 'REINFORCE' ? (
            <div className="text-muted-foreground">
              Adding <span className="text-emerald-400 font-medium">{pePerPixel} PE</span> stake to {pixelCount} pixel(s)
            </div>
          ) : null}

          {/* Total and Available PE */}
          <div className="flex justify-between border-t border-border pt-1 mt-1">
            <span className="text-muted-foreground font-medium">Total Cost:</span>
            <span className="text-foreground font-medium">{validationResult.requiredPeTotal.toLocaleString()} PE</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground font-medium">Available:</span>
            <span className={cn(
              "font-medium",
              validationResult.availablePe >= validationResult.requiredPeTotal 
                ? "text-emerald-400" 
                : "text-destructive"
            )}>
              {validationResult.availablePe.toLocaleString()} PE
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
