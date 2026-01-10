import { useState, useCallback } from 'react';
import { ChevronUp, ChevronDown, Paintbrush, Grid2X2, Eraser, Hand, Pipette, Shield, Swords, Zap } from 'lucide-react';
import { GlassIconButton } from '@/components/ui/glass-icon-button';
import { BASE_PALETTE_GRID, ALL_COLORS } from '@/lib/palettes/basePaletteGrid';
import { MATERIALS, getMaterialsByCategory, isMaterial, getMaterial } from '@/lib/materials/materialRegistry';
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

const CATEGORY_LABELS: Record<string, string> = {
  metals: 'Metals',
  holographic: 'Holographic',
  elements: 'Elements',
  special: 'Special',
};

// Get the correct action icon based on map mode
function ModeIcon({ mapMode, className }: { mapMode: MapMode; className?: string }) {
  switch (mapMode) {
    case 'defend':
      return <Shield className={className} />;
    case 'attack':
      return <Swords className={className} />;
    case 'reinforce':
      return <Zap className={className} />;
    default:
      return <Paintbrush className={className} />;
  }
}

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
  const [paletteTab, setPaletteTab] = useState<'colors' | 'special'>('colors');
  const { play } = useSound();
  
  const materialsByCategory = getMaterialsByCategory();
  
  const canPaint = canInteractAtZoom(zoom);
  const isPaintMode = mode === 'paint';
  const isEraser = paintTool === 'ERASER';
  
  // Hint text based on mode
  const hintText = isPaintMode 
    ? 'Hold Space to paint continuously' 
    : 'Hold Space to select continuously';

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

  // Calculate pending PE for action modes
  const pendingPE = pePerPixel * selectionCount;

  return (
    <div 
      className="fixed left-1/2 -translate-x-1/2 z-20 pointer-events-none bottom-[calc(3.5rem+env(safe-area-inset-bottom))] max-w-[calc(100vw-1rem)] sm:max-w-[540px]"
      style={{ width: isExpanded ? '100%' : 'auto' }}
    >
      <div 
        className={cn(
          "pointer-events-auto overflow-hidden transition-all duration-200 rounded-2xl shadow-lg",
          "glass-hud-strong",
          isEyedropperActive && "ring-2 ring-foreground"
        )}
      >
        {/* Header - always visible */}
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          {/* Left: Interaction mode toggle */}
          <div className="flex items-center gap-1.5 shrink-0">
            {canPaint && (
              <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-0.5">
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
                  title={isPaintMode ? "Draw mode: Click/drag to paint" : `${mode} mode: Click/drag to select`}
                >
                  <ModeIcon mapMode={mode} className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Center: Collapsed summary OR selection count when expanded */}
          <div className="flex-1 flex justify-center min-w-0">
            {!isExpanded ? (
              /* Collapsed summary - mode aware */
              isPaintMode ? (
                /* Paint mode: show color swatch + hex/label */
                selectedColor ? (
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-5 h-5 rounded-md border border-border/50 shrink-0" 
                      style={{ 
                        background: isMaterial(selectedColor) 
                          ? getMaterial(selectedColor)?.cssGradient 
                          : selectedColor 
                      }}
                    />
                    <span className="text-xs font-mono text-muted-foreground truncate max-w-24">
                      {isMaterial(selectedColor) 
                        ? getMaterial(selectedColor)?.label 
                        : selectedColor.toUpperCase()}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">No color</span>
                )
              ) : (
                /* Action mode: show mode icon + pending PE */
                <div className="flex items-center gap-2">
                  <ModeIcon mapMode={mode} className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-mono tabular-nums text-muted-foreground">
                    {pendingPE.toLocaleString()} PE
                  </span>
                </div>
              )
            ) : (
              /* Expanded: show count if any */
              (draftCount > 0 || selectionCount > 0) && (
                <span className="text-[10px] font-medium text-muted-foreground tabular-nums">
                  {isPaintMode ? `Draft: ${draftCount} px` : `Selected: ${selectionCount} px`}
                </span>
              )
            )}
          </div>

          {/* Right: Eyedropper + Expand */}
          <div className="flex items-center gap-1 shrink-0">
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
              <div className="text-center py-1.5 mb-2 text-[11px] text-muted-foreground bg-muted/50 rounded-lg">
                Zoom in to interact
              </div>
            )}
            
            {isPaintMode ? (
              /* PAINT MODE: Color palette with tabs */
              <>
                {/* Tool row - ALWAYS CLICKABLE (outside opacity wrapper) */}
                {canPaint && (
                  <div className="flex items-center justify-between mb-2">
                    {/* Left: Tool cluster */}
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
                    
                    {/* Right: Tab switch */}
                    <div className="flex gap-1">
                      <button
                        onClick={() => setPaletteTab('colors')}
                        className={cn(
                          "px-2.5 py-1 text-[11px] rounded-md transition-colors",
                          paletteTab === 'colors' 
                            ? "bg-foreground text-background" 
                            : "bg-muted/70 text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Colors
                      </button>
                      <button
                        onClick={() => setPaletteTab('special')}
                        className={cn(
                          "px-2.5 py-1 text-[11px] rounded-md transition-colors",
                          paletteTab === 'special' 
                            ? "bg-foreground text-background" 
                            : "bg-muted/70 text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Special
                      </button>
                    </div>
                  </div>
                )}

                {/* Palette grid - THIS is what gets disabled when eraser is active */}
                <div className={cn(
                  "transition-opacity",
                  isEraser && "opacity-40 pointer-events-none"
                )}>

                <div className="max-h-48 overflow-y-auto">
                  {paletteTab === 'colors' ? (
                    /* Standard color palette - CONTINUOUS GRID (no separators) */
                    <div className="grid grid-cols-9 sm:grid-cols-12 gap-1.5">
                      {ALL_COLORS.map((color, index) => {
                        const isSelected = selectedColor?.toUpperCase() === color.toUpperCase();
                        return (
                          <button
                            key={`${color}-${index}`}
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
                  ) : (
                    /* Special materials palette */
                    <div className="space-y-3">
                      {Array.from(materialsByCategory.entries()).map(([category, materials]) => (
                        <div key={category}>
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                            {CATEGORY_LABELS[category] || category}
                          </div>
                          <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5">
                            {materials.map((material) => {
                              const isSelected = selectedColor === material.id;
                              return (
                                <button
                                  key={material.id}
                                  onClick={() => handleColorClick(material.id)}
                                  disabled={!canPaint}
                                  className={cn(
                                    "w-7 h-7 rounded-md transition-all duration-100 focus:outline-none relative overflow-hidden",
                                    "hover:scale-110 hover:z-10",
                                    canPaint && "hover:ring-1 hover:ring-foreground/30",
                                    isSelected && "ring-2 ring-foreground scale-110 z-10",
                                    !canPaint && "opacity-40 cursor-not-allowed"
                                  )}
                                  style={{ background: material.cssGradient }}
                                  title={material.label}
                                />
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                </div>
                
                {/* Single micro-hint at bottom */}
                {canPaint && (
                  <div className="text-[10px] text-muted-foreground/50 text-center pt-2">
                    {hintText}
                  </div>
                )}
              </>
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
                      {pendingPE.toLocaleString()} PE
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">Available:</span>
                    <span className={cn(
                      "font-medium tabular-nums",
                      availablePe >= pendingPE 
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
