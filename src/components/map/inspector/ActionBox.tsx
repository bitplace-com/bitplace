import { Paintbrush, Shield, Swords, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PeInput } from '../PeInput';
import { COLOR_PALETTE } from '../hooks/useMapState';
import { cn } from '@/lib/utils';
import type { GameMode, ValidateResult } from '@/hooks/useGameActions';

interface ActionBoxProps {
  mode: GameMode;
  selectedColor: string;
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

const modeConfig: Record<GameMode, { icon: React.ReactNode; label: string; buttonLabel: string }> = {
  PAINT: { icon: <Paintbrush className="h-4 w-4" />, label: 'Paint', buttonLabel: 'Paint' },
  DEFEND: { icon: <Shield className="h-4 w-4" />, label: 'Defend', buttonLabel: 'Defend' },
  ATTACK: { icon: <Swords className="h-4 w-4" />, label: 'Attack', buttonLabel: 'Attack' },
  REINFORCE: { icon: <Plus className="h-4 w-4" />, label: 'Reinforce', buttonLabel: 'Reinforce' },
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
  const canConfirm = isValidated && !isCommitting;

  return (
    <div className="border-t border-border/30 p-4 space-y-4 bg-background/30">
      {/* Mode Label */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {config.icon}
        </div>
        <span className="text-sm font-semibold">{config.label} Mode</span>
      </div>

      {/* Color Picker for PAINT mode */}
      {mode === 'PAINT' && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Color</div>
          <div className="grid grid-cols-9 gap-1">
            {COLOR_PALETTE.map((color) => (
              <button
                key={color}
                onClick={() => onColorSelect(color)}
                className={cn(
                  'aspect-square rounded-md border-2 transition-all duration-200 hover:scale-110 focus-ring',
                  selectedColor.toUpperCase() === color.toUpperCase()
                    ? 'border-primary ring-2 ring-primary/30 scale-110'
                    : 'border-transparent hover:border-foreground/20'
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      )}

      {/* PE Input for non-PAINT modes */}
      {mode !== 'PAINT' && (
        <div className="space-y-2">
          <PeInput 
            value={pePerPixel} 
            onChange={onPePerPixelChange} 
            pixelCount={pixelCount}
          />
          <div className="text-xs text-muted-foreground">
            Total: <span className="font-medium text-foreground">{(pePerPixel * pixelCount).toLocaleString()} PE</span> for {pixelCount} pixel(s)
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        {needsValidation && !isValidated && (
          <Button
            className="flex-1 rounded-xl"
            variant="secondary"
            onClick={onValidate}
            disabled={isValidating}
          >
            {isValidating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Validating...
              </>
            ) : (
              'Validate'
            )}
          </Button>
        )}

        {(isValidated || !needsValidation) && (
          <Button
            className="flex-1 rounded-xl shadow-md"
            onClick={onConfirm}
            disabled={!canConfirm && needsValidation}
          >
            {isCommitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Confirming...
              </>
            ) : (
              <>
                {config.icon}
                <span className="ml-2">{config.buttonLabel}</span>
              </>
            )}
          </Button>
        )}
      </div>

      {/* Validation Status */}
      {validationResult && !validationResult.ok && (
        <div className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
          Validation failed: {validationResult.invalidPixels.length} invalid pixel(s)
        </div>
      )}
    </div>
  );
}
