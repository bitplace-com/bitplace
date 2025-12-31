import { useState, useCallback } from 'react';
import { ChevronUp, ChevronDown, Pipette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { COLOR_PALETTE } from './hooks/useMapState';
import { useUsedColors } from './hooks/useUsedColors';
import { cn } from '@/lib/utils';

interface ColorPaletteProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
  viewportPixels: Map<string, { color: string }>;
  onEyedropperToggle: (active: boolean) => void;
  isEyedropperActive: boolean;
}

type TabType = 'all' | 'used';

export function ColorPalette({
  selectedColor,
  onColorSelect,
  viewportPixels,
  onEyedropperToggle,
  isEyedropperActive,
}: ColorPaletteProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  
  const usedColors = useUsedColors(viewportPixels);
  
  const displayColors = activeTab === 'all' ? COLOR_PALETTE : usedColors;

  const handleColorClick = useCallback((color: string) => {
    onColorSelect(color);
  }, [onColorSelect]);

  const handleEyedropperClick = useCallback(() => {
    onEyedropperToggle(!isEyedropperActive);
  }, [onEyedropperToggle, isEyedropperActive]);

  return (
    <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-20 w-full max-w-md px-4 sm:px-0">
      <div 
        className={cn(
          "bg-secondary/95 backdrop-blur-md rounded-xl border border-border shadow-2xl overflow-hidden transition-all duration-200",
          isEyedropperActive && "ring-2 ring-primary/50 animate-pulse"
        )}
      >
        {/* Header - always visible */}
        <div className="flex items-center justify-between gap-3 px-3 py-2.5 border-b border-border/50">
          {/* Selected color preview */}
          <div className="flex items-center gap-2.5">
            <div
              className="h-8 w-8 rounded-lg border-2 border-border shadow-inner flex-shrink-0"
              style={{ backgroundColor: selectedColor }}
            />
            <span className="text-xs font-mono text-muted-foreground hidden sm:block">
              {selectedColor.toUpperCase()}
            </span>
          </div>

          {/* Tabs */}
          {isExpanded && (
            <div className="flex items-center gap-1 bg-background/50 rounded-lg p-0.5">
              <button
                onClick={() => setActiveTab('all')}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                  activeTab === 'all'
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                All
              </button>
              <button
                onClick={() => setActiveTab('used')}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                  activeTab === 'used'
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Used
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleEyedropperClick}
              className={cn(
                "h-8 w-8 rounded-lg",
                isEyedropperActive && "bg-primary text-primary-foreground"
              )}
              title="Eyedropper (Alt+Click)"
            >
              <Pipette className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 rounded-lg"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Color grid - expandable */}
        {isExpanded && (
          <div className="p-2.5">
            {displayColors.length === 0 ? (
              <div className="text-center py-4 text-sm text-muted-foreground">
                No colors in viewport
              </div>
            ) : (
              <div className="grid grid-cols-9 gap-1">
                {displayColors.map((color) => {
                  const isSelected = selectedColor.toUpperCase() === color.toUpperCase();
                  return (
                    <button
                      key={color}
                      onClick={() => handleColorClick(color)}
                      className={cn(
                        "aspect-square rounded-md border-2 transition-all duration-150 hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        isSelected
                          ? "border-primary ring-2 ring-primary/30 scale-110 z-10"
                          : "border-transparent hover:border-foreground/20"
                      )}
                      style={{ backgroundColor: color }}
                      title={color.toUpperCase()}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
