import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { InvalidPixel } from '@/hooks/useGameActions';
import type { GameMode } from '@/hooks/useGameActions';

interface InvalidPixelListProps {
  invalidPixels: InvalidPixel[];
  onExcludeInvalid?: () => void;
  isPartialValid?: boolean;
  mode?: GameMode;
}

const reasonLabels: Record<string, string> = {
  NOT_OWNER: 'Not owned by you',
  IS_OWNER: 'Cannot target your own pixel',
  OPPOSITE_SIDE: 'Already have opposite contribution',
  EMPTY_PIXEL: 'Pixel is empty',
  INSUFFICIENT_PE: 'Not enough PE',
  INVALID_COLOR: 'Invalid color',
  MIN_STAKE: 'Minimum 1 PE stake required',
  NO_CONTRIBUTION: 'No contribution found',
};

const modeVerbs: Record<string, string> = {
  ERASE: 'erased',
  REINFORCE: 'reinforced',
  DEFEND: 'defended',
  ATTACK: 'attacked',
  PAINT: 'painted',
  WITHDRAW_DEF: 'withdrawn',
  WITHDRAW_ATK: 'withdrawn',
  WITHDRAW_REINFORCE: 'withdrawn',
};

const reasonSuffixes: Record<string, string> = {
  EMPTY_PIXEL: 'they are empty',
  NOT_OWNER: "you don't own them",
  IS_OWNER: 'they belong to you',
  OPPOSITE_SIDE: 'opposite contribution exists',
  NO_CONTRIBUTION: 'no contribution found',
  MIN_STAKE: 'minimum stake not met',
};

export function InvalidPixelList({ invalidPixels, onExcludeInvalid, isPartialValid, mode }: InvalidPixelListProps) {
  if (invalidPixels.length === 0) return null;

  const groupedByReason = invalidPixels.reduce((acc, pixel) => {
    const reason = pixel.reason;
    if (!acc[reason]) acc[reason] = [];
    acc[reason].push(pixel);
    return acc;
  }, {} as Record<string, InvalidPixel[]>);

  const colorClass = isPartialValid 
    ? 'border-amber-500/20 bg-amber-500/5' 
    : 'border-destructive/20 bg-destructive/5';
  const textColorClass = isPartialValid ? 'text-amber-600' : 'text-destructive';
  const iconColorClass = isPartialValid ? 'text-amber-500' : 'text-destructive';

  const verb = modeVerbs[mode ?? 'ERASE'] ?? 'processed';
  const reasons = Object.keys(groupedByReason);
  const suffix = reasons.length === 1 && reasonSuffixes[reasons[0]]
    ? ` — ${reasonSuffixes[reasons[0]]}`
    : '';

  return (
    <div className={`border-t ${colorClass} p-3 space-y-2`}>
      <div className="flex items-center gap-2 text-xs font-medium">
        <AlertCircle className={`h-3 w-3 ${iconColorClass}`} />
        <span className={textColorClass}>
          {invalidPixels.length} pixel{invalidPixels.length > 1 ? 's' : ''} can't be {verb}{suffix}
        </span>
      </div>
      
      {/* Grouped summary by reason */}
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

      {/* Contextual explanation */}
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        These pixels don't meet the requirements for this action and will be skipped.
      </p>

      {/* Exclude button */}
      {isPartialValid && onExcludeInvalid && (
        <Button
          size="sm"
          variant="outline"
          className="w-full h-8 text-xs"
          onClick={onExcludeInvalid}
        >
          Exclude {invalidPixels.length} invalid pixel{invalidPixels.length > 1 ? 's' : ''}
        </Button>
      )}
    </div>
  );
}
