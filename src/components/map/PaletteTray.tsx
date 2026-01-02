import { useState, useCallback } from 'react';
import { ChevronUp, ChevronDown, Pipette, Eraser, Hand, Paintbrush } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { COLOR_PALETTE, Z_PAINT, type InteractionMode } from './hooks/useMapState';
import { useUsedColors } from './hooks/useUsedColors';
import { useSound } from '@/hooks/useSound';
import { cn } from '@/lib/utils';

interface PaletteTrayProps {
  selectedColor: string | null;
  onColorSelect: (color: string | null) => void;
  viewportPixels: Map<string, { color: string }>;
  onEyedropperToggle: (active: boolean) => void;
  isEyedropperActive: boolean;
  zoom: number;
  interactionMode: InteractionMode;
  onInteractionModeChange: (mode: InteractionMode) => void;
}

type TabType = 'all' | 'used';

export function PaletteTray({
  selectedColor,
  onColorSelect,
  viewportPixels,
  onEyedropperToggle,
  isEyedropperActive,
  zoom,
  interactionMode,
  onInteractionModeChange,
}: PaletteTrayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const { play } = useSound();
  
  const usedColors = useUsedColors(viewportPixels);
  const displayColors = activeTab === 'all' ? COLOR_PALETTE : usedColors;
  const canPaint = zoom >= Z_PAINT;
  const isEraser = selectedColor === null;

  const handleColorClick = useCallback((color: string | null) => {
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
      style={{ width: isExpanded ? 'min(85%, 580px)' : 'auto' }}
    >
      <div 
        className={cn(
          "pointer-events-auto bg-secondary/90 backdrop-blur-md rounded-xl border border-white/10 shadow-xl overflow-hidden transition-all duration-200",
          isEyedropperActive && "ring-2 ring-primary/50"
        )}
      >
        {/* Header - always visible */}
        <div className="flex items-center justify-between gap-2 px-2 py-1.5">
          {/* Selected color preview */}
          <div className="flex items-center gap-1.5">
            {isEraser ? (
              <div className="h-6 w-6 rounded-md border border-white/20 flex items-center justify-center bg-[repeating-conic-gradient(#808080_0%_25%,_#404040_25%_50%)] bg-[length:6px_6px]">
                <Eraser className="h-3 w-3 text-white drop-shadow-md" />
              </div>
            ) : (
              <div
                className="h-6 w-6 rounded-md border border-white/20 shadow-sm flex-shrink-0"
                style={{ backgroundColor: selectedColor }}
              />
            )}
            <span className="text-[10px] font-mono font-medium text-foreground/80">
              {isEraser ? 'ERASER' : selectedColor?.toUpperCase()}
            </span>
          </div>

          {/* Tabs - only when expanded */}
          {isExpanded && (
            <div className="flex items-center">
              <button
                onClick={() => setActiveTab('all')}
                className={cn(
                  "px-2 py-0.5 text-[10px] font-medium transition-colors border-b-2",
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
                  "px-2 py-0.5 text-[10px] font-medium transition-colors border-b-2",
                  activeTab === 'used'
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                Used
              </button>
            </div>
          )}

          {/* Mode toggle + Actions */}
          <div className="flex items-center gap-1">
            {/* Compact Drag/Draw mode toggle */}
            {canPaint && (
              <div className="flex items-center gap-0.5 bg-muted/30 rounded-md p-0.5">
                <button
                  onClick={() => onInteractionModeChange('drag')}
                  className={cn(
                    "p-1 rounded transition-colors",
                    interactionMode === 'drag' 
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title="Drag mode: Pan map, click to paint"
                >
                  <Hand className="h-3 w-3" />
                </button>
                <button
                  onClick={() => onInteractionModeChange('draw')}
                  className={cn(
                    "p-1 rounded transition-colors",
                    interactionMode === 'draw' 
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title="Draw mode: Click/drag to paint"
                >
                  <Paintbrush className="h-3 w-3" />
                </button>
              </div>
            )}
            
            {isExpanded && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleEyedropperClick}
                disabled={!canPaint}
                className={cn(
                  "h-6 w-6 rounded-md",
                  isEyedropperActive && "bg-primary text-primary-foreground"
                )}
                title="Eyedropper (Alt+Click)"
              >
                <Pipette className="h-3 w-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleExpand}
              className="h-6 w-6 rounded-md"
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronUp className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>

        {/* Color grid - expandable */}
        {isExpanded && (
          <div className="px-3 pb-3 pt-1">
            {/* Keyboard hints */}
            {canPaint && (
              <div className="flex gap-1.5 mb-2 flex-wrap">
                <span className="text-[9px] text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">
                  SPACE to paint
                </span>
                <span className="text-[9px] text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">
                  SHIFT+drag to select
                </span>
              </div>
            )}
            
            {/* Zoom hint */}
            {!canPaint && (
              <div className="text-center py-1 mb-2 text-[10px] text-muted-foreground bg-muted/20 rounded-md">
                Zoom in to paint
              </div>
            )}
            
            {displayColors.length === 0 && activeTab === 'used' ? (
              <div className="text-center py-2 text-[10px] text-muted-foreground">
                No colors in viewport
              </div>
            ) : (
              <div className="max-h-44 overflow-y-auto">
                <div className="grid grid-cols-10 sm:grid-cols-13 md:grid-cols-16 gap-1.5">
                  {/* Eraser button - always first */}
                  <button
                    onClick={() => handleColorClick(null)}
                    disabled={!canPaint}
                    className={cn(
                      "aspect-square min-w-[22px] rounded-md border flex items-center justify-center transition-all duration-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      "bg-[repeating-conic-gradient(#808080_0%_25%,_#404040_25%_50%)] bg-[length:6px_6px]",
                      canPaint && "hover:scale-105",
                      isEraser
                        ? "border-primary ring-2 ring-primary/40 scale-105 z-10"
                        : "border-white/10 hover:border-white/30",
                      !canPaint && "opacity-40 cursor-not-allowed"
                    )}
                    title="Eraser"
                  >
                    <Eraser className="h-2.5 w-2.5 text-white drop-shadow-md" />
                  </button>
                  
                  {/* Color swatches */}
                  {displayColors.map((color) => {
                    const isSelected = selectedColor?.toUpperCase() === color.toUpperCase();
                    return (
                      <button
                        key={color}
                        onClick={() => handleColorClick(color)}
                        disabled={!canPaint}
                        className={cn(
                          "aspect-square min-w-[22px] rounded-md border transition-all duration-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
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
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
