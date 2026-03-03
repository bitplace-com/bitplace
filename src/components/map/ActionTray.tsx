import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Hand } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { PixelIcon } from '@/components/icons';
import { GlassIconButton } from '@/components/ui/glass-icon-button';
import { BASE_PALETTE_GRID, ALL_COLORS } from '@/lib/palettes/basePaletteGrid';
import { GRADIENT_ROWS } from '@/lib/palettes/gradientPalette';
import { useSound } from '@/hooks/useSound';
import { cn } from '@/lib/utils';
import { PEIcon } from '@/components/ui/pe-icon';
import { Input } from '@/components/ui/input';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
  
  // Deposit/Withdraw direction for action modes
  actionDirection?: 'deposit' | 'withdraw';
  onActionDirectionChange?: (direction: 'deposit' | 'withdraw') => void;
  
  // Callbacks
  onColorSelect: (color: string | null) => void;
  onPaintToolChange: (tool: PaintTool) => void;
  onBrushSizeChange: (size: BrushSize) => void;
  onInteractionModeChange: (mode: InteractionMode) => void;
  onPePerPixelChange: (pe: number) => void;
}

const PE_CHIPS = [1, 5, 10, 25, 100];


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
  actionDirection = 'deposit',
  onActionDirectionChange,
  onColorSelect,
  onPaintToolChange,
  onBrushSizeChange,
  onInteractionModeChange,
  onPePerPixelChange,
}: ActionTrayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [paletteTab, setPaletteTab] = useState<'colors' | 'gradients' | 'custom'>('colors');
  const [customHex, setCustomHex] = useState('#ff0000');
  const [recentCustomColors, setRecentCustomColors] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('bitplace-custom-colors');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [hoveredColor, setHoveredColor] = useState<string | null>(null);
  const { play } = useSound();
  const isMobile = useIsMobile();

  // Listen for tour expand/collapse events
  useEffect(() => {
    const handleTourExpand = () => setIsExpanded(true);
    const handleTourCollapse = () => setIsExpanded(false);
    window.addEventListener('bitplace:tour-expand-tray', handleTourExpand);
    window.addEventListener('bitplace:tour-collapse-tray', handleTourCollapse);
    return () => {
      window.removeEventListener('bitplace:tour-expand-tray', handleTourExpand);
      window.removeEventListener('bitplace:tour-collapse-tray', handleTourCollapse);
    };
  }, []);
  
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

  const addRecentCustomColor = useCallback((color: string) => {
    setRecentCustomColors(prev => {
      const upper = color.toUpperCase();
      const next = [upper, ...prev.filter(c => c !== upper)].slice(0, 10);
      localStorage.setItem('bitplace-custom-colors', JSON.stringify(next));
      return next;
    });
  }, []);

  const removeRecentCustomColor = useCallback((color: string) => {
    setRecentCustomColors(prev => {
      const next = prev.filter(c => c !== color.toUpperCase());
      localStorage.setItem('bitplace-custom-colors', JSON.stringify(next));
      return next;
    });
  }, []);

  const handleCustomColorApply = useCallback((hex: string) => {
    const clean = hex.startsWith('#') ? hex : `#${hex}`;
    if (/^#[0-9a-fA-F]{6}$/.test(clean)) {
      handleColorClick(clean);
      addRecentCustomColor(clean);
      setCustomHex(clean);
    }
  }, [handleColorClick, addRecentCustomColor]);

  const handleToolClick = useCallback((tool: PaintTool, size?: BrushSize) => {
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
  }, [interactionMode, onInteractionModeChange, onPaintToolChange, onBrushSizeChange]);

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
      data-tour="action-tray"
      className="fixed left-1/2 -translate-x-1/2 z-20 pointer-events-none max-w-[calc(100vw-2rem)] sm:max-w-[540px] flex flex-col items-center"
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
          Zoom in to see pixels and paint
        </button>
      )}
      <div className="flex items-end gap-2 w-full">
        <div 
          className={cn(
            "pointer-events-auto overflow-hidden transition-all duration-200 rounded-2xl shadow-lg flex-1 min-w-0",
            "glass-hud-strong",
            isExpanded && "w-full",
            isEyedropperActive && "ring-2 ring-foreground"
          )}
        >
        {/* Header - always visible */}
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          {/* Left: Interaction mode toggle */}
          <div className="flex items-center gap-1 shrink-0">
            
            {(
              <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-0.5">
                <button
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => onInteractionModeChange('drag')}
                  className={cn(
                    "w-10 h-10 sm:w-7 sm:h-7 rounded-md flex items-center justify-center transition-colors touch-target",
                    interactionMode === 'drag' 
                      ? "bg-foreground text-background" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title="Hand mode: Pan map"
                >
                  <Hand className="h-5 w-5 sm:h-4 sm:w-4" />
                </button>
                <button
                  onMouseDown={e => e.preventDefault()}
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
              isPaintMode ? null : (
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

          {/* Right: Expand */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleToggleExpand}
              onMouseDown={e => e.preventDefault()}
              className="h-9 w-9 inline-flex items-center justify-center rounded-md bg-transparent hover:bg-accent active:bg-accent/80 text-muted-foreground transition-colors"
            >
              {isExpanded ? (
                <PixelIcon name="chevronDown" className="h-4 w-4" />
              ) : (
                <PixelIcon name="chevronUp" className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div className="px-2 pb-2 sm:px-3 sm:pb-3 overflow-hidden">
            
            {isPaintMode ? (
              /* PAINT MODE: Color palette with tabs */
              <>
                {/* Tool row - always visible, dimmed in explore mode */}
                <div className={cn(
                  "flex items-center gap-0.5 bg-muted/50 rounded-lg p-0.5 mb-2 transition-opacity",
                  interactionMode === 'drag' && "opacity-40 pointer-events-none"
                )}>
                    <button
                      onMouseDown={e => e.preventDefault()}
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
                      onMouseDown={e => e.preventDefault()}
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
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => handleToolClick('ERASER')}
                      className={cn(
                        "w-10 h-10 sm:w-7 sm:h-7 rounded-md flex items-center justify-center transition-colors touch-target",
                        paintTool === 'ERASER'
                          ? "bg-foreground text-background" 
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      title="Eraser"
                    >
                      <PixelIcon name="trash" className="h-5 w-5 sm:h-4 sm:w-4" />
                    </button>
                </div>

                {/* Active color hex display - between tools and tabs */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {(hoveredColor || selectedColor) && (
                      <>
                        <div 
                          className="w-4 h-4 rounded border border-border/50 shrink-0" 
                          style={{ background: hoveredColor || selectedColor || undefined }}
                        />
                        <span className="text-xs font-mono text-muted-foreground">
                          {(hoveredColor || selectedColor || '').toUpperCase()}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Tab switch */}
                  <div className="flex gap-1">
                  <button
                    onMouseDown={e => e.preventDefault()}
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
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => setPaletteTab('gradients')}
                    className={cn(
                      "px-2.5 py-1 text-[11px] rounded-md transition-colors",
                      paletteTab === 'gradients' 
                        ? "bg-foreground text-background" 
                        : "bg-muted/70 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Gradients
                  </button>
                  <button
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => setPaletteTab('custom')}
                    className={cn(
                      "px-2.5 py-1 text-[11px] rounded-md transition-colors",
                      paletteTab === 'custom' 
                        ? "bg-foreground text-background" 
                        : "bg-muted/70 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Custom
                  </button>
                  </div>
                </div>

                {/* Palette grid - disabled only when eraser is active */}
                <div className={cn(
                  "transition-opacity",
                  (isEraser || interactionMode === 'drag') && "opacity-40 pointer-events-none"
                )}>

                <div className="max-h-56 overflow-auto py-1 px-1 w-full">
                  {paletteTab === 'colors' ? (
                    <div className="grid grid-cols-[repeat(8,1fr)] sm:grid-cols-[repeat(10,1fr)] gap-0.5 sm:gap-1">
                      {displayColors.map((color, index) => {
                        const isSelected = selectedColor?.toUpperCase() === color.toUpperCase();
                        return (
                          <button
                            key={`${color}-${index}`}
                            onClick={() => handleColorClick(color)}
                            onMouseEnter={() => setHoveredColor(color)}
                            onMouseLeave={() => setHoveredColor(null)}
                            disabled={!canPaint}
                            className={cn(
                              "w-full aspect-square rounded-md transition-all duration-100 focus:outline-none touch-target",
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
                  ) : paletteTab === 'gradients' ? (
                    /* Gradients palette */
                    <div className="space-y-2 py-0.5">
                      {GRADIENT_ROWS.map((row) => (
                        <div key={row.label} className="flex items-center gap-2">
                          <span className="text-[9px] w-10 text-muted-foreground shrink-0 text-right">
                            {row.label}
                          </span>
                          <div className="flex gap-0.5 sm:gap-1 flex-1">
                            {row.colors.map((color) => {
                              const isSelected = selectedColor?.toUpperCase() === color.toUpperCase();
                              return (
                                <button
                                  key={color}
                                  onClick={() => handleColorClick(color)}
                                  onMouseEnter={() => setHoveredColor(color)}
                                  onMouseLeave={() => setHoveredColor(null)}
                                  disabled={!canPaint}
                                  className={cn(
                                    "flex-1 aspect-square min-w-0 rounded-md transition-all duration-100 focus:outline-none touch-target",
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
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Custom color picker */
                    <div className="space-y-3 py-1">
                      {/* Picker + preview row */}
                      <div className="flex items-center gap-3">
                        {/* Native color input styled as a swatch */}
                        <label className="relative w-12 h-12 rounded-lg border-2 border-border cursor-pointer overflow-hidden shrink-0">
                          <input
                            type="color"
                            value={customHex}
                            onChange={(e) => {
                              setCustomHex(e.target.value);
                              setHoveredColor(e.target.value);
                            }}
                            onBlur={() => setHoveredColor(null)}
                            className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
                          />
                          <div className="w-full h-full" style={{ backgroundColor: customHex }} />
                        </label>

                        {/* Hex input */}
                        <div className="flex items-center gap-1.5 flex-1">
                          <span className="text-xs text-muted-foreground font-mono">#</span>
                          <Input
                            value={customHex.replace('#', '').toUpperCase()}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
                              setCustomHex(`#${val}`);
                              if (val.length === 6) setHoveredColor(`#${val}`);
                            }}
                            onBlur={() => setHoveredColor(null)}
                            maxLength={6}
                            className="h-9 font-mono text-sm tracking-wider"
                            placeholder="FF0000"
                          />
                        </div>

                        {/* Apply button */}
                        <button
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => handleCustomColorApply(customHex)}
                          disabled={!canPaint || !/^#[0-9a-fA-F]{6}$/.test(customHex)}
                          className={cn(
                            "h-9 px-3 rounded-md text-xs font-medium transition-colors shrink-0",
                            "bg-foreground text-background hover:bg-foreground/90",
                            "disabled:opacity-40 disabled:cursor-not-allowed"
                          )}
                        >
                          Apply
                        </button>
                      </div>

                      {/* Template-detected colors */}
                      {templateGuideColors.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] text-muted-foreground">From template</span>
                          <div className="flex gap-1 flex-wrap max-h-24 overflow-y-auto">
                            {templateGuideColors.slice(0, 30).map((color) => {
                              const isSelected = selectedColor?.toUpperCase() === color.toUpperCase();
                              return (
                                <button
                                  key={color}
                                  onClick={() => handleCustomColorApply(color)}
                                  onMouseEnter={() => setHoveredColor(color)}
                                  onMouseLeave={() => setHoveredColor(null)}
                                  disabled={!canPaint}
                                  className={cn(
                                    "w-8 h-8 sm:w-6 sm:h-6 rounded-md transition-all duration-100 focus:outline-none touch-target shadow-[inset_0_0_0_1px_rgba(0,0,0,0.15)]",
                                    canPaint && "hover:ring-1 hover:ring-foreground/30",
                                    isSelected && "ring-2 ring-foreground scale-105 z-10",
                                    !canPaint && "opacity-40 cursor-not-allowed"
                                  )}
                                  style={{ backgroundColor: color }}
                                  title={color}
                                />
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Recent custom colors */}
                      {recentCustomColors.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] text-muted-foreground">Recent</span>
                          <div className="flex gap-1 flex-wrap">
                            {recentCustomColors.map((color) => {
                              const isSelected = selectedColor?.toUpperCase() === color.toUpperCase();
                              return (
                                <div key={color} className="relative group">
                                  <button
                                    onClick={() => handleCustomColorApply(color)}
                                    onMouseEnter={() => setHoveredColor(color)}
                                    onMouseLeave={() => setHoveredColor(null)}
                                    disabled={!canPaint}
                                    className={cn(
                                      "w-8 h-8 sm:w-6 sm:h-6 rounded-md transition-all duration-100 focus:outline-none touch-target shadow-[inset_0_0_0_1px_rgba(0,0,0,0.15)]",
                                      canPaint && "hover:ring-1 hover:ring-foreground/30",
                                      isSelected && "ring-2 ring-foreground scale-105 z-10",
                                      !canPaint && "opacity-40 cursor-not-allowed"
                                    )}
                                    style={{ backgroundColor: color }}
                                    title={color}
                                  />
                                  <button
                                    onClick={(e) => { e.stopPropagation(); removeRecentCustomColor(color); }}
                                    className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-background border border-border text-muted-foreground text-[8px] leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:text-foreground"
                                    title="Remove"
                                  >
                                    ×
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
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
                {/* Deposit / Withdraw Toggle */}
                <TooltipProvider delayDuration={300}>
                  <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-0.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => onActionDirectionChange?.('deposit')}
                          className={cn(
                            "flex-1 h-10 sm:h-7 rounded-md flex items-center justify-center gap-1.5 text-xs font-medium transition-colors touch-target",
                            actionDirection === 'deposit'
                              ? "bg-foreground text-background"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <PixelIcon name="plus" className="h-3.5 w-3.5" />
                          <span>Deposit</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">Add PE to selected pixels</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => onActionDirectionChange?.('withdraw')}
                          className={cn(
                            "flex-1 h-10 sm:h-7 rounded-md flex items-center justify-center gap-1.5 text-xs font-medium transition-colors touch-target",
                            actionDirection === 'withdraw'
                              ? "bg-foreground text-background"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <PixelIcon name="minus" className="h-3.5 w-3.5" />
                          <span>Withdraw</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">Remove PE from selected pixels</TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>

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
                    <span className="text-muted-foreground">{actionDirection === 'withdraw' ? 'Refund:' : 'Required:'}</span>
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
    </div>
  );
}
