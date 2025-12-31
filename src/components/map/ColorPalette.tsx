import { useState } from 'react';
import { Palette, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { COLOR_PALETTE } from './hooks/useMapState';
import { cn } from '@/lib/utils';

interface ColorPaletteProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
}

export function ColorPalette({ selectedColor, onColorSelect }: ColorPaletteProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="absolute bottom-4 left-4 z-10">
      <div className="bg-secondary/95 backdrop-blur-sm rounded-lg border border-border shadow-lg overflow-hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 h-auto"
        >
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <div
              className="h-4 w-4 rounded border border-border"
              style={{ backgroundColor: selectedColor }}
            />
          </div>
          {isExpanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronUp className="h-3 w-3" />
          )}
        </Button>

        {isExpanded && (
          <div className="p-2 border-t border-border">
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
                  title={color}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
