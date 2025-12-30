import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PeInput } from './PeInput';
import type { GameMode, ValidateResult } from '@/hooks/useGameActions';
import { Loader2 } from 'lucide-react';

interface ActionConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: GameMode;
  pixelCount: number;
  validationResult: ValidateResult | null;
  pePerPixel: number;
  onPePerPixelChange: (value: number) => void;
  onConfirm: () => void;
  onRevalidate: () => void;
  isValidating: boolean;
  isCommitting: boolean;
  availablePe?: number;
}

export function ActionConfirmDialog({
  open,
  onOpenChange,
  mode,
  pixelCount,
  validationResult,
  pePerPixel,
  onPePerPixelChange,
  onConfirm,
  onRevalidate,
  isValidating,
  isCommitting,
  availablePe,
}: ActionConfirmDialogProps) {
  const needsPeInput = mode !== 'PAINT';
  const isValid = validationResult?.ok === true;
  const requiredPe = validationResult?.requiredPeTotal ?? 0;

  const getModeTitle = () => {
    switch (mode) {
      case 'PAINT': return 'Confirm Paint';
      case 'DEFEND': return 'Confirm Defend';
      case 'ATTACK': return 'Confirm Attack';
      case 'REINFORCE': return 'Confirm Reinforce';
    }
  };

  const getModeDescription = () => {
    switch (mode) {
      case 'PAINT': return 'Paint the selected pixels with your chosen color.';
      case 'DEFEND': return 'Add defensive PE to protect these pixels from takeover.';
      case 'ATTACK': return 'Add attack PE to help conquer these pixels.';
      case 'REINFORCE': return 'Increase your stake on these pixels.';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{getModeTitle()}</DialogTitle>
          <DialogDescription>{getModeDescription()}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Pixels selected</span>
            <span className="font-medium">{pixelCount}</span>
          </div>

          {needsPeInput && (
            <PeInput
              value={pePerPixel}
              onChange={(val) => {
                onPePerPixelChange(val);
              }}
              pixelCount={pixelCount}
              availablePe={availablePe}
            />
          )}

          {validationResult && (
            <>
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total PE required</span>
                  <span className="font-medium">{requiredPe.toLocaleString()} PE</span>
                </div>

                {mode === 'PAINT' && validationResult.breakdown && (
                  <>
                    {validationResult.breakdown.empty > 0 && (
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>• Empty pixels (1 PE each)</span>
                        <span>{validationResult.breakdown.empty}</span>
                      </div>
                    )}
                    {validationResult.breakdown.ownedByOthers > 0 && (
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>• Takeovers</span>
                        <span>{validationResult.breakdown.ownedByOthers}</span>
                      </div>
                    )}
                    {validationResult.breakdown.ownedByUser > 0 && (
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>• Color changes (free)</span>
                        <span>{validationResult.breakdown.ownedByUser}</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {!isValid && validationResult.invalidPixels?.length > 0 && (
                <div className="text-sm text-destructive">
                  {validationResult.invalidPixels.length} invalid pixel(s)
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCommitting}
          >
            Cancel
          </Button>
          
          {needsPeInput && !isValid && (
            <Button
              onClick={onRevalidate}
              disabled={isValidating}
            >
              {isValidating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Validate
            </Button>
          )}

          {isValid && (
            <Button
              onClick={onConfirm}
              disabled={isCommitting}
            >
              {isCommitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm ({requiredPe} PE)
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
