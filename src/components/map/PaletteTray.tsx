import { useState, useCallback, useEffect } from 'react';
import { ChevronUp, ChevronDown, Pipette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { COLOR_PALETTE, Z_PAINT } from './hooks/useMapState';
import { useUsedColors } from './hooks/useUsedColors';
import { useSound } from '@/hooks/useSound';
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
  const { play } = useSound();
  
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

  const handleToggleExpand = useCallback(() => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    play(newExpanded ? 'palette_open' : 'palette_close');
  }, [isExpanded, play]);

  return (
    <div 
      className="fixed bottom-14 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
      style={{ width: isExpanded ? 'min(85%, 680px)' : 'auto' }}
    >
      <div 
        className={cn(
          "pointer-events-auto bg-secondary/90 backdrop-blur-md rounded-xl border border-white/10 shadow-xl overflow-hidden transition-all duration-200",
          isEyedropperActive && "ring-2 ring-primary/50"
        )}
      >
        {/* Header - always visible */}
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          {/* Selected color preview */}
          <div className="flex items-center gap-2">
            <div
              className="h-7 w-7 rounded-lg border border-white/20 shadow-sm flex-shrink-0"
              style={{ backgroundColor: selectedColor }}
            />
            <span className="text-xs font-mono font-medium text-foreground/80">
              {selectedColor.toUpperCase()}
            </span>
            {!isExpanded && (
              <span className="text-[10px] text-muted-foreground hidden sm:block uppercase tracking-wider">Palette</span>
            )}
          </div>

          {/* Tabs - only when expanded */}
          {isExpanded && (
            <div className="flex items-center">
              <button
                onClick={() => setActiveTab('all')}
                className={cn(
                  "px-2.5 py-1 text-[11px] font-medium transition-colors border-b-2",
                  activeTab === 'all'
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                All
              </button>
              <button
                onClick={() => setActiveTab('used')}
                className={cn(
                  "px-2.5 py-1 text-[11px] font-medium transition-colors border-b-2",
                  activeTab === 'used'
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                Used
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-0.5">
            {isExpanded && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleEyedropperClick}
                disabled={!canPaint}
                className={cn(
                  "h-7 w-7 rounded-lg",
                  isEyedropperActive && "bg-primary text-primary-foreground"
                )}
                title="Eyedropper (Alt+Click)"
              >
                <Pipette className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleExpand}
              className="h-7 w-7 rounded-lg"
            >
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronUp className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>

        {/* Color grid - expandable */}
        {isExpanded && (
          <div className="px-4 pb-4 pt-2">
            {/* Zoom hint */}
            {!canPaint && (
              <div className="text-center py-1.5 mb-3 text-[11px] text-muted-foreground bg-muted/20 rounded-md">
                Zoom in to paint
              </div>
            )}
            
            {displayColors.length === 0 ? (
              <div className="text-center py-3 text-xs text-muted-foreground">
                No colors in viewport
              </div>
            ) : (
              <div className="grid grid-cols-9 sm:grid-cols-12 md:grid-cols-14 lg:grid-cols-18 gap-2">
                {displayColors.map((color) => {
                  const isSelected = selectedColor.toUpperCase() === color.toUpperCase();
                  return (
                    <button
                      key={color}
                      onClick={() => handleColorClick(color)}
                      disabled={!canPaint}
                      className={cn(
                        "aspect-square min-w-[26px] rounded-md border transition-all duration-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        canPaint && "hover:scale-105",
                        isSelected
                          ? "border-primary ring-2 ring-primary/40 scale-105 z-10"
                          : "border-white/10 hover:border-white/30",
                        !canPaint && "opacity-40 cursor-not-allowed"
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
