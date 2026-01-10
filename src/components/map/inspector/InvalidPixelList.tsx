import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { InvalidPixel } from '@/hooks/useGameActions';

interface InvalidPixelListProps {
  invalidPixels: InvalidPixel[];
  onExcludeInvalid?: () => void;
  isPartialValid?: boolean; // True when some pixels are valid, some aren't
}

const reasonLabels: Record<string, string> = {
  NOT_OWNER: 'Not owned by you',
  IS_OWNER: 'Cannot target your own pixel',
  OPPOSITE_SIDE: 'Already have opposite contribution',
  EMPTY_PIXEL: 'Pixel is empty',
  INSUFFICIENT_PE: 'Not enough PE',
  INVALID_COLOR: 'Invalid color',
};

export function InvalidPixelList({ invalidPixels, onExcludeInvalid, isPartialValid }: InvalidPixelListProps) {
  if (invalidPixels.length === 0) return null;

  // Group invalid pixels by reason
  const groupedByReason = invalidPixels.reduce((acc, pixel) => {
    const reason = pixel.reason;
    if (!acc[reason]) acc[reason] = [];
    acc[reason].push(pixel);
    return acc;
  }, {} as Record<string, InvalidPixel[]>);

  // Use amber for partial-valid (can exclude), destructive for full-invalid
  const colorClass = isPartialValid 
    ? 'border-amber-500/20 bg-amber-500/5' 
    : 'border-destructive/20 bg-destructive/5';
  const textColorClass = isPartialValid ? 'text-amber-600' : 'text-destructive';
  const iconColorClass = isPartialValid ? 'text-amber-500' : 'text-destructive';

  return (
    <div className={`border-t ${colorClass} p-3`}>
      <div className="flex items-center justify-between mb-2">
        <div className={`flex items-center gap-2 text-xs font-medium ${textColorClass}`}>
          <AlertCircle className={`h-3 w-3 ${iconColorClass}`} />
          <span>
            {isPartialValid ? 'Cannot Erase' : 'Invalid Pixels'} ({invalidPixels.length})
          </span>
        </div>
        {onExcludeInvalid && isPartialValid && (
          <Button 
            type="button"
            size="sm" 
            variant="ghost" 
            onClick={onExcludeInvalid}
            className="h-6 px-2 text-[10px] text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
          >
            Exclude All
          </Button>
        )}
      </div>
      
      {/* Show grouped summary by reason */}
      <div className="space-y-1">
        {Object.entries(groupedByReason).map(([reason, pixels]) => (
          <div key={reason} className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {reasonLabels[reason] || reason}
            </span>
            <span className={`font-mono ${textColorClass}`}>
              {pixels.length} px
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
