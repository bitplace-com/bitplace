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
    <div className="border-t border-border p-3 space-y-3 bg-background/50">
      {/* Mode Label */}
      <div className="flex items-center gap-2 text-sm font-medium">
        <span className="text-primary">{config.icon}</span>
        <span>{config.label} Mode</span>
      </div>

      {/* Color Picker for PAINT mode */}
      {mode === 'PAINT' && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">Color</div>
          <div className="grid grid-cols-8 gap-1">
            {COLOR_PALETTE.map((color) => (
              <button
                key={color}
                onClick={() => onColorSelect(color)}
                className={cn(
                  'h-6 w-6 rounded border-2 transition-all hover:scale-110',
                  selectedColor === color
                    ? 'border-primary ring-2 ring-primary/30'
                    : 'border-transparent hover:border-muted-foreground/30'
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
            Total: {(pePerPixel * pixelCount).toLocaleString()} PE for {pixelCount} pixel(s)
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        {needsValidation && !isValidated && (
          <Button
            className="flex-1"
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
            className="flex-1"
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
        <div className="text-xs text-destructive">
          Validation failed: {validationResult.invalidPixels.length} invalid pixel(s)
        </div>
      )}
    </div>
  );
}
