import { AlertCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { InvalidPixel } from '@/hooks/useGameActions';

interface InvalidPixelListProps {
  invalidPixels: InvalidPixel[];
}

const reasonLabels: Record<string, string> = {
  NOT_OWNER: 'You must own this pixel',
  IS_OWNER: 'Cannot target your own pixel',
  OPPOSITE_SIDE: 'Already have opposite contribution',
  EMPTY_PIXEL: 'Pixel must be owned',
  INSUFFICIENT_PE: 'Not enough PE',
  INVALID_COLOR: 'Invalid color',
};

export function InvalidPixelList({ invalidPixels }: InvalidPixelListProps) {
  if (invalidPixels.length === 0) return null;

  return (
    <div className="border-t border-destructive/20 bg-destructive/5 p-3">
      <div className="flex items-center gap-2 text-xs font-medium text-destructive mb-2">
        <AlertCircle className="h-3 w-3" />
        <span>Invalid Pixels ({invalidPixels.length})</span>
      </div>
      
      <ScrollArea className="max-h-24">
        <div className="space-y-1">
          {invalidPixels.slice(0, 10).map((pixel, i) => (
            <div
              key={i}
              className="flex items-center justify-between text-xs"
            >
              <span className="font-mono text-muted-foreground">
                ({pixel.x}, {pixel.y})
              </span>
              <span className="text-destructive">
                {reasonLabels[pixel.reason] || pixel.reason}
              </span>
            </div>
          ))}
          {invalidPixels.length > 10 && (
            <div className="text-xs text-muted-foreground text-center pt-1">
              +{invalidPixels.length - 10} more invalid pixels
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
