import { useState, useCallback, useMemo } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { PixelIcon } from '@/components/icons';
import { GlassIconButton } from '@/components/ui/glass-icon-button';
import { BASE_PALETTE_GRID, ALL_COLORS } from '@/lib/palettes/basePaletteGrid';
import { MATERIALS, getMaterialsByCategory, isMaterial, getMaterial } from '@/lib/materials/materialRegistry';
import { useSound } from '@/hooks/useSound';
import { cn } from '@/lib/utils';
import { PEIcon } from '@/components/ui/pe-icon';
import { Input } from '@/components/ui/input';
import { PlacesModal } from '@/components/modals/PlacesModal';
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
  
  // Map position for places
  currentLat?: number;
  currentLng?: number;
  
  // Zoom helper
  canPaint: boolean;
  onZoomIn: () => void;
  
  // Dynamic positioning based on StatusStrip height
  statusStripHeight?: number;
  
  // Template palette filtering
  templateGuideColors?: string[];  // Colors used in active template
  filterToGuideColors?: boolean;   // Whether to filter palette
  
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
      return <PixelIcon name="shield" className={className} />;
    case 'attack':
      return <PixelIcon name="swords" className={className} />;
    case 'reinforce':
      return <PixelIcon name="bolt" className={className} />;
    default:
      return <PixelIcon name="brush" className={className} />;
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
  currentLat = 0,
  currentLng = 0,
  canPaint: canPaintProp,
  onZoomIn,
  statusStripHeight = 48,
  templateGuideColors = [],
  filterToGuideColors = false,
  onColorSelect,
  onPaintToolChange,
  onBrushSizeChange,
  onInteractionModeChange,
  onPePerPixelChange,
}: ActionTrayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [paletteTab, setPaletteTab] = useState<'colors' | 'special'>('colors');
  const [placesOpen, setPlacesOpen] = useState(false);
  const { play } = useSound();
  const isMobile = useIsMobile();
  
  const materialsByCategory = getMaterialsByCategory();
  
  // Use prop for external canPaint control
  const canPaint = canPaintProp;
  const isPaintMode = mode === 'paint';
  const isEraser = paintTool === 'ERASER';

  // Filter palette colors when template guide is active
  const displayColors = useMemo(() => {
    if (filterToGuideColors && templateGuideColors.length > 0) {
      // Create uppercase set for efficient lookup
      const guideSet = new Set(templateGuideColors.map(c => c.toUpperCase()));
      return ALL_COLORS.filter(c => guideSet.has(c.toUpperCase()));
    }
    return ALL_COLORS;
  }, [filterToGuideColors, templateGuideColors]);
  
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
    // onColorSelect now atomically sets color + enables draw mode
    onColorSelect(color);
    // Only need to change paint tool if eraser was active
    if (paintTool === 'ERASER') {
      onPaintToolChange('BRUSH');
    }
  }, [canPaint, onColorSelect, paintTool, onPaintToolChange]);

  const handleToolClick = useCallback((tool: PaintTool, size?: BrushSize) => {
    if (!canPaint) return;
    
    // Auto-switch to draw mode when selecting a tool
    if (interactionMode !== 'draw') {
      onInteractionModeChange('draw');
    }
    
    if (tool === 'ERASER') {
      onPaintToolChange('ERASER');
    } else {
      onPaintToolChange('BRUSH');
      if (size) {
        onBrushSizeChange(size);
      }
    }
  }, [canPaint, interactionMode, onInteractionModeChange, onPaintToolChange, onBrushSizeChange]);

  const handleEyedropperClick = useCallback(() => {
    if (!canPaint) return;
    onEyedropperToggle(!isEyedropperActive);
  }, [canPaint, onEyedropperToggle, isEyedropperActive]);

  // Calculate pending PE for action modes
  const pendingPE = pePerPixel * selectionCount;

  // Calculate bottom offset: statusStripHeight + gap (8px) for mobile only
  // On desktop, use fixed 4rem offset
  const bottomOffset = isMobile 
    ? `calc(${statusStripHeight + 8}px + env(safe-area-inset-bottom, 0px))`
    : `calc(4rem + env(safe-area-inset-bottom, 0px))`;

  return (
    <div 
      className="fixed left-1/2 -translate-x-1/2 z-20 pointer-events-none max-w-[calc(100vw-1rem)] sm:max-w-[540px] flex flex-col items-center"
      style={{ 
        width: isExpanded ? '100%' : 'auto',
        bottom: bottomOffset,
      }}
    >
      {/* Zoom helper button - positioned above the ActionTray */}
      {!canPaint && (
        <button
          onClick={onZoomIn}
          className="mb-2 px-3 py-1.5 text-xs font-medium rounded-full bg-muted/60 backdrop-blur-sm text-foreground hover:bg-muted border border-border/50 transition-all pointer-events-auto hover:scale-105 active:scale-95"
        >
          Zoom in to see paints
        </button>
      )}
      <div 
        className={cn(
          "pointer-events-auto overflow-hidden transition-all duration-200 rounded-2xl shadow-lg",
          "glass-hud-strong",
          isEyedropperActive && "ring-2 ring-foreground"
        )}
      >
        {/* Header - always visible */}
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          {/* Left: Pin button (standalone) + Interaction mode toggle */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Pin button for Places - visually standalone with extra spacing */}
            <GlassIconButton
              variant="ghost"
              size="sm"
              onClick={() => setPlacesOpen(true)}
              title="Pinned Locations"
              className="mr-1"
            >
              <PixelIcon name="thumbtack" className="h-4 w-4" />
            </GlassIconButton>
            
            {/* More prominent visual separator */}
            <div className="w-px h-6 bg-border/70 mx-1" />
            
            {canPaint && (
              <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-0.5">
                <button
                  onClick={() => onInteractionModeChange('drag')}
                  className={cn(
                    "w-10 h-10 sm:w-7 sm:h-7 rounded-md flex items-center justify-center transition-colors touch-target",
                    interactionMode === 'drag' 
                      ? "bg-foreground text-background" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title="Hand mode: Pan map"
                >
                  <PixelIcon name="hand" className="h-5 w-5 sm:h-4 sm:w-4" />
                </button>
                <button
                  onClick={() => onInteractionModeChange('draw')}
                  className={cn(
                    "w-10 h-10 sm:w-7 sm:h-7 rounded-md flex items-center justify-center transition-colors touch-target",
                    interactionMode === 'draw' 
                      ? "bg-foreground text-background" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title={isPaintMode ? "Draw mode: Click/drag to paint" : `${mode} mode: Click/drag to select`}
                >
                  <ModeIcon mapMode={mode} className="h-5 w-5 sm:h-4 sm:w-4" />
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
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md border-2 border-dashed border-muted-foreground/50 shrink-0" />
                    <span className="text-xs text-muted-foreground">No color</span>
                  </div>
                )
              ) : (
              /* Action mode: show pending PE only (no redundant mode icon) */
                <span className="text-xs font-mono tabular-nums text-muted-foreground">
                  {pendingPE.toLocaleString()} PE
                </span>
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
                <PixelIcon name="pipette" className="h-4 w-4" />
              </GlassIconButton>
            )}
            <GlassIconButton
              variant="ghost"
              size="sm"
              onClick={handleToggleExpand}
              className="rounded-md"
            >
              {isExpanded ? (
                <PixelIcon name="chevronDown" className="h-4 w-4" />
              ) : (
                <PixelIcon name="chevronUp" className="h-4 w-4" />
              )}
            </GlassIconButton>
          </div>
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div className="px-3 pb-3 overflow-hidden">
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
                          "w-10 h-10 sm:w-7 sm:h-7 rounded-md flex items-center justify-center transition-colors touch-target",
                          paintTool === 'BRUSH' && brushSize === '1x'
                            ? "bg-foreground text-background" 
                            : "text-muted-foreground hover:text-foreground"
                        )}
                        title="Brush 1x"
                      >
                        <PixelIcon name="pixel" className="h-5 w-5 sm:h-4 sm:w-4" />
                      </button>
                      <button
                        onClick={() => handleToolClick('BRUSH', '2x2')}
                        className={cn(
                          "w-10 h-10 sm:w-7 sm:h-7 rounded-md flex items-center justify-center transition-colors touch-target",
                          paintTool === 'BRUSH' && brushSize === '2x2'
                            ? "bg-foreground text-background" 
                            : "text-muted-foreground hover:text-foreground"
                        )}
                        title="Brush 2×2"
                      >
                        <PixelIcon name="grid2x2" className="h-5 w-5 sm:h-4 sm:w-4" />
                      </button>
                      <button
                        onClick={() => handleToolClick('ERASER')}
                        className={cn(
                          "w-10 h-10 sm:w-7 sm:h-7 rounded-md flex items-center justify-center transition-colors touch-target",
                          paintTool === 'ERASER'
                            ? "bg-foreground text-background" 
                            : "text-muted-foreground hover:text-foreground"
                        )}
                        title="Eraser"
                      >
                        <PixelIcon name="eraser" className="h-5 w-5 sm:h-4 sm:w-4" />
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

                <div className="max-h-48 overflow-y-auto overflow-x-hidden py-1.5 px-1">
                  {paletteTab === 'colors' ? (
                    /* Standard color palette - larger on mobile, with proper spacing */
                    <div className="grid grid-cols-8 sm:grid-cols-12 gap-1.5 w-full pr-0.5">
                      {displayColors.map((color, index) => {
                        const isSelected = selectedColor?.toUpperCase() === color.toUpperCase();
                        return (
                          <button
                            key={`${color}-${index}`}
                            onClick={() => handleColorClick(color)}
                            disabled={!canPaint}
                            className={cn(
                              "w-8 h-8 sm:w-6 sm:h-6 rounded-lg sm:rounded-md transition-all duration-100 focus:outline-none touch-target",
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
                    <div className="space-y-3 py-0.5">
                      {Array.from(materialsByCategory.entries()).map(([category, materials]) => (
                        <div key={category}>
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                            {CATEGORY_LABELS[category] || category}
                          </div>
                          <div className="grid grid-cols-5 sm:grid-cols-8 gap-2 sm:gap-1.5 w-full">
                            {materials.map((material) => {
                              const isSelected = selectedColor === material.id;
                              return (
                                <button
                                  key={material.id}
                                  onClick={() => handleColorClick(material.id)}
                                  disabled={!canPaint}
                                  className={cn(
                                    "w-10 h-10 sm:w-7 sm:h-7 rounded-lg sm:rounded-md transition-all duration-100 focus:outline-none relative overflow-hidden touch-target",
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
                <div className="flex items-center gap-3 sm:gap-2">
                  <PEIcon size="md" className="sm:hidden" />
                  <PEIcon size="sm" className="hidden sm:block" />
                  <Input 
                    type="number" 
                    min={1}
                    value={pePerPixel} 
                    onChange={(e) => onPePerPixelChange(Math.max(1, parseInt(e.target.value) || 1))}
                    className="h-11 sm:h-7 w-24 sm:w-20 text-base sm:text-sm font-mono"
                  />
                  <span className="text-[10px] text-muted-foreground">per px</span>
                </div>
                
                {/* Quick Chips - larger on mobile */}
                <div className="flex gap-2 sm:gap-1.5 flex-wrap">
                  {PE_CHIPS.map(val => (
                    <button 
                      key={val}
                      onClick={() => onPePerPixelChange(val)}
                      className={cn(
                        "px-4 py-2.5 sm:px-2 sm:py-0.5 rounded-lg sm:rounded text-sm sm:text-[10px] font-mono transition-colors touch-target",
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

      {/* Places Modal */}
      <PlacesModal
        open={placesOpen}
        onOpenChange={setPlacesOpen}
        currentLat={currentLat}
        currentLng={currentLng}
        currentZoom={zoom}
      />
    </div>
  );
}
