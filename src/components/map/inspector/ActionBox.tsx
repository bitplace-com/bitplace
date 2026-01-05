import { Paintbrush, Shield, Swords, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PeInput } from '../PeInput';
import type { GameMode, ValidateResult } from '@/hooks/useGameActions';

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
}

const modeConfig: Record<GameMode, { icon: React.ReactNode; label: string }> = {
  PAINT: { icon: <Paintbrush className="h-3.5 w-3.5" />, label: 'Paint' },
  DEFEND: { icon: <Shield className="h-3.5 w-3.5" />, label: 'Defend' },
  ATTACK: { icon: <Swords className="h-3.5 w-3.5" />, label: 'Attack' },
  REINFORCE: { icon: <Plus className="h-3.5 w-3.5" />, label: 'Reinforce' },
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
}: ActionBoxProps) {
  const config = modeConfig[mode];
  const needsValidation = mode !== 'PAINT' || pixelCount > 1;
  const isValidated = validationResult?.ok === true;
  // For single-pixel PAINT, allow direct confirm without validation
  const canConfirm = (isValidated || (!needsValidation && mode === 'PAINT')) && !isCommitting;

  return (
    <div className="border-t border-border/20 p-3 space-y-3 bg-background/20">
      {/* Mode + Color inline for PAINT */}
      {mode === 'PAINT' ? (
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
            {config.icon}
          </div>
          {selectedColor ? (
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
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
            {config.icon}
          </div>
          <span className="text-xs font-medium">{config.label}</span>
        </div>
      )}

      {/* PE Input for non-PAINT modes */}
      {mode !== 'PAINT' && (
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

      {/* Validation Status */}
      {validationResult && !validationResult.ok && (
        <div className="text-[10px] text-destructive bg-destructive/10 px-2 py-1.5 rounded-md">
          {validationResult.invalidPixels.length} invalid pixel(s)
        </div>
      )}
    </div>
  );
}
