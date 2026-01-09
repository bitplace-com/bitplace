import { useState, useCallback } from 'react';
import { ChevronUp, ChevronDown, Paintbrush, Grid2X2, Eraser, Hand, Pipette } from 'lucide-react';
import { GlassIconButton } from '@/components/ui/glass-icon-button';
import { BASE_PALETTE } from '@/lib/palettes/basePalette';
import { useSound } from '@/hooks/useSound';
import { cn } from '@/lib/utils';
import { canInteractAtZoom } from '@/lib/pixelGrid';
import { PEIcon } from '@/components/ui/pe-icon';
import { Input } from '@/components/ui/input';
import type { MapMode, InteractionMode, PaintTool, BrushSize } from './hooks/useMapState';

interface ActionTrayProps {
  // Mode & tool state
  mode: MapMode;
  paintTool: PaintTool;
  brushSize: BrushSize;
  selectedColor: string | null;
  interactionMode: InteractionMode;
  zoom: number;
  
  // Selection counts
  draftCount: number;
  selectionCount: number;
  
  // PE state for action modes
  pePerPixel: number;
  availablePe: number;
  
  // Eyedropper
  isEyedropperActive: boolean;
  onEyedropperToggle: (active: boolean) => void;
  
  // Callbacks
  onColorSelect: (color: string | null) => void;
  onPaintToolChange: (tool: PaintTool) => void;
  onBrushSizeChange: (size: BrushSize) => void;
  onInteractionModeChange: (mode: InteractionMode) => void;
  onPePerPixelChange: (pe: number) => void;
}

const PE_CHIPS = [1, 5, 10, 25, 100];

export function ActionTray({
  mode,
  paintTool,
  brushSize,
  selectedColor,
  interactionMode,
  zoom,
  draftCount,
  selectionCount,
  pePerPixel,
  availablePe,
  isEyedropperActive,
  onEyedropperToggle,
  onColorSelect,
  onPaintToolChange,
  onBrushSizeChange,
  onInteractionModeChange,
  onPePerPixelChange,
}: ActionTrayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { play } = useSound();
  
  const canPaint = canInteractAtZoom(zoom);
  const isPaintMode = mode === 'paint';
  const isEraser = paintTool === 'ERASER';
  const displayCount = draftCount > 0 ? draftCount : selectionCount;
  
  // Hint text based on mode
  const hintText = isPaintMode 
    ? 'Hold Space to paint continuously' 
    : 'Hold Space to select';

  const handleToggleExpand = useCallback(() => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    play(newExpanded ? 'palette_open' : 'palette_close');
  }, [isExpanded, play]);

  const handleColorClick = useCallback((color: string) => {
    if (!canPaint) return;
    onColorSelect(color);
    // Switch to BRUSH if eraser was active
    if (paintTool === 'ERASER') {
      onPaintToolChange('BRUSH');
    }
  }, [canPaint, onColorSelect, paintTool, onPaintToolChange]);

  const handleToolClick = useCallback((tool: PaintTool, size?: BrushSize) => {
    if (!canPaint) return;
    if (tool === 'ERASER') {
      onPaintToolChange('ERASER');
    } else {
      onPaintToolChange('BRUSH');
      if (size) {
        onBrushSizeChange(size);
      }
    }
  }, [canPaint, onPaintToolChange, onBrushSizeChange]);

  const handleEyedropperClick = useCallback(() => {
    if (!canPaint) return;
    onEyedropperToggle(!isEyedropperActive);
  }, [canPaint, onEyedropperToggle, isEyedropperActive]);

  return (
    <div 
      className="fixed left-1/2 -translate-x-1/2 z-20 pointer-events-none bottom-[calc(2.75rem+env(safe-area-inset-bottom))] max-w-[calc(100vw-1rem)] sm:max-w-[540px]"
      style={{ width: isExpanded ? '100%' : 'auto' }}
    >
      <div 
        className={cn(
          "pointer-events-auto overflow-hidden transition-all duration-200 rounded-2xl",
          "glass-hud-strong",
          isEyedropperActive && "ring-2 ring-foreground"
        )}
      >
        {/* Header - always visible */}
        <div className="flex items-center justify-between gap-3 px-3 py-2.5">
          {/* Left: Tool Switch */}
          <div className="flex items-center gap-1.5">
            {/* Interaction mode toggle */}
            {canPaint && (
              <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-0.5 mr-1">
                <button
                  onClick={() => onInteractionModeChange('drag')}
                  className={cn(
                    "w-7 h-7 rounded-md flex items-center justify-center transition-colors",
                    interactionMode === 'drag' 
                      ? "bg-foreground text-background" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title="Hand mode: Pan map"
                >
                  <Hand className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onInteractionModeChange('draw')}
                  className={cn(
                    "w-7 h-7 rounded-md flex items-center justify-center transition-colors",
                    interactionMode === 'draw' 
                      ? "bg-foreground text-background" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title="Draw mode: Click/drag to paint"
                >
                  <Paintbrush className="h-4 w-4" />
                </button>
              </div>
            )}
            
            {/* Tool switch (Brush 1x / Brush 2x2 / Eraser) - only in paint mode */}
            {isPaintMode && canPaint && (
              <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-0.5">
                <button
                  onClick={() => handleToolClick('BRUSH', '1x')}
                  className={cn(
                    "w-7 h-7 rounded-md flex items-center justify-center transition-colors",
                    paintTool === 'BRUSH' && brushSize === '1x'
                      ? "bg-foreground text-background" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title="Brush 1x"
                >
                  <Paintbrush className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleToolClick('BRUSH', '2x2')}
                  className={cn(
                    "w-7 h-7 rounded-md flex items-center justify-center transition-colors",
                    paintTool === 'BRUSH' && brushSize === '2x2'
                      ? "bg-foreground text-background" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title="Brush 2×2"
                >
                  <Grid2X2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleToolClick('ERASER')}
                  className={cn(
                    "w-7 h-7 rounded-md flex items-center justify-center transition-colors",
                    paintTool === 'ERASER'
                      ? "bg-foreground text-background" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title="Eraser"
                >
                  <Eraser className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Center: Selection summary */}
          <div className="flex-1 flex justify-center">
            {displayCount > 0 && (
              <span className="text-[10px] font-medium text-muted-foreground tabular-nums">
                {isPaintMode ? `Draft: ${displayCount} px` : `Selected: ${displayCount} px`}
              </span>
            )}
          </div>

          {/* Right: Eyedropper + Expand */}
          <div className="flex items-center gap-1">
            {isExpanded && isPaintMode && (
              <GlassIconButton
                variant={isEyedropperActive ? 'active' : 'ghost'}
                size="sm"
                onClick={handleEyedropperClick}
                disabled={!canPaint}
                className="rounded-md"
                title="Eyedropper (Alt+Click)"
              >
                <Pipette className="h-4 w-4" />
              </GlassIconButton>
            )}
            <GlassIconButton
              variant="ghost"
              size="sm"
              onClick={handleToggleExpand}
              className="rounded-md"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </GlassIconButton>
          </div>
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div className="px-3 pb-3">
            {/* Zoom hint */}
            {!canPaint && (
              <div className="text-center py-1.5 mb-3 text-[11px] text-muted-foreground bg-muted/50 rounded-lg">
                Zoom in to interact
              </div>
            )}
            
            {isPaintMode ? (
              /* PAINT MODE: Color palette */
              <div className={cn(
                "transition-opacity",
                isEraser && "opacity-40 pointer-events-none"
              )}>
                <div className="max-h-48 overflow-y-auto">
                  <div className="space-y-2">
                    {BASE_PALETTE.map((group, groupIndex) => (
                      <div key={group.name}>
                        {/* Color swatches */}
                        <div className="grid grid-cols-9 sm:grid-cols-12 gap-1.5">
                          {group.colors.map((color) => {
                            const isSelected = selectedColor?.toUpperCase() === color.toUpperCase();
                            return (
                              <button
                                key={color}
                                onClick={() => handleColorClick(color)}
                                disabled={!canPaint}
                                className={cn(
                                  "w-7 h-7 rounded-md transition-all duration-100 focus:outline-none",
                                  canPaint && "hover:ring-1 hover:ring-foreground/30",
                                  isSelected && "ring-2 ring-foreground scale-105 z-10",
                                  !canPaint && "opacity-40 cursor-not-allowed"
                                )}
                                style={{ backgroundColor: color }}
                                title={color.toUpperCase()}
                              />
                            );
                          })}
                        </div>
                        {/* Separator between groups */}
                        {groupIndex < BASE_PALETTE.length - 1 && (
                          <div className="h-px bg-border/30 mt-2" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Micro-hint */}
                {canPaint && (
                  <div className="text-[10px] text-muted-foreground/60 text-center pt-2">
                    {hintText}
                  </div>
                )}
              </div>
            ) : (
              /* ACTION MODE (Defend/Attack/Reinforce): Stake controls */
              <div className="space-y-3">
                {/* PE Per Pixel Input */}
                <div className="flex items-center gap-2">
                  <PEIcon size="sm" />
                  <Input 
                    type="number" 
                    min={1}
                    value={pePerPixel} 
                    onChange={(e) => onPePerPixelChange(Math.max(1, parseInt(e.target.value) || 1))}
                    className="h-7 w-20 text-sm font-mono"
                  />
                  <span className="text-[10px] text-muted-foreground">per px</span>
                </div>
                
                {/* Quick Chips */}
                <div className="flex gap-1.5 flex-wrap">
                  {PE_CHIPS.map(val => (
                    <button 
                      key={val}
                      onClick={() => onPePerPixelChange(val)}
                      className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-mono transition-colors",
                        pePerPixel === val 
                          ? "bg-foreground text-background" 
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      {val}
                    </button>
                  ))}
                </div>
                
                {/* Summary */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">Required:</span>
                    <span className="font-medium tabular-nums">
                      {(pePerPixel * selectionCount).toLocaleString()} PE
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">Available:</span>
                    <span className={cn(
                      "font-medium tabular-nums",
                      availablePe >= pePerPixel * selectionCount 
                        ? "text-emerald-500" 
                        : "text-destructive"
                    )}>
                      {availablePe.toLocaleString()} PE
                    </span>
                  </div>
                </div>
                
                {/* Micro-hint */}
                {canPaint && (
                  <div className="text-[10px] text-muted-foreground/60 text-center pt-1">
                    {hintText}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
