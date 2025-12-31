import { useState, useCallback } from 'react';
import { ChevronUp, ChevronDown, Pipette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { COLOR_PALETTE, Z_PAINT } from './hooks/useMapState';
import { useUsedColors } from './hooks/useUsedColors';
import { cn } from '@/lib/utils';

interface PaletteTrayProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
  viewportPixels: Map<string, { color: string }>;
  onEyedropperToggle: (active: boolean) => void;
  isEyedropperActive: boolean;
  zoom: number;
}

type TabType = 'all' | 'used';

export function PaletteTray({
  selectedColor,
  onColorSelect,
  viewportPixels,
  onEyedropperToggle,
  isEyedropperActive,
  zoom,
}: PaletteTrayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  
  const usedColors = useUsedColors(viewportPixels);
  const displayColors = activeTab === 'all' ? COLOR_PALETTE : usedColors;
  const canPaint = zoom >= Z_PAINT;

  const handleColorClick = useCallback((color: string) => {
    if (!canPaint) return;
    onColorSelect(color);
  }, [onColorSelect, canPaint]);

  const handleEyedropperClick = useCallback(() => {
    if (!canPaint) return;
    onEyedropperToggle(!isEyedropperActive);
  }, [onEyedropperToggle, isEyedropperActive, canPaint]);

  return (
    <div 
      className="fixed bottom-16 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
      style={{ width: isExpanded ? 'min(85%, 720px)' : 'auto' }}
    >
      <div 
        className={cn(
          "pointer-events-auto bg-secondary/95 backdrop-blur-md rounded-xl border border-border shadow-2xl overflow-hidden transition-all duration-200",
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
            <span className="text-xs font-mono text-muted-foreground">
              {selectedColor.toUpperCase()}
            </span>
            {!isExpanded && (
              <span className="text-xs text-muted-foreground hidden sm:block">Palette</span>
            )}
          </div>

          {/* Tabs - only when expanded */}
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
            {isExpanded && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleEyedropperClick}
                disabled={!canPaint}
                className={cn(
                  "h-8 w-8 rounded-lg",
                  isEyedropperActive && "bg-primary text-primary-foreground"
                )}
                title="Eyedropper (Alt+Click)"
              >
                <Pipette className="h-4 w-4" />
              </Button>
            )}
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
          <div className="p-3">
            {/* Zoom hint */}
            {!canPaint && (
              <div className="text-center py-2 mb-2 text-xs text-muted-foreground bg-muted/30 rounded-lg">
                Zoom in to paint
              </div>
            )}
            
            {displayColors.length === 0 ? (
              <div className="text-center py-4 text-sm text-muted-foreground">
                No colors in viewport
              </div>
            ) : (
              <div className="grid grid-cols-9 sm:grid-cols-12 md:grid-cols-15 lg:grid-cols-18 gap-1.5">
                {displayColors.map((color) => {
                  const isSelected = selectedColor.toUpperCase() === color.toUpperCase();
                  return (
                    <button
                      key={color}
                      onClick={() => handleColorClick(color)}
                      disabled={!canPaint}
                      className={cn(
                        "aspect-square rounded-md border-2 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        canPaint && "hover:scale-110",
                        isSelected
                          ? "border-primary ring-2 ring-primary/30 scale-110 z-10"
                          : "border-transparent hover:border-foreground/20",
                        !canPaint && "opacity-50 cursor-not-allowed"
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
