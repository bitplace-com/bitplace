import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GlassPanel } from '@/components/ui/glass-panel';
import { PixelTab } from './PixelTab';
import { AreaTab } from './AreaTab';
import { ActionBox } from './ActionBox';
import { InvalidPixelList } from './InvalidPixelList';
import { MAX_SELECTION_PIXELS } from '../hooks/useSelection';
import { useIsMobile } from '@/hooks/use-mobile';
import type { GameMode, ValidateResult, InvalidPixel, ActionError } from '@/hooks/useGameActions';

interface InspectorPanelProps {
  selectedPixels: { x: number; y: number }[];
  mode: GameMode;
  selectedColor: string | null;
  currentUserId?: string;
  validationResult: ValidateResult | null;
  invalidPixels: InvalidPixel[];
  pePerPixel: number;
  onPePerPixelChange: (value: number) => void;
  onColorSelect: (color: string) => void;
  onValidate: () => void;
  onConfirm: () => void;
  onClearSelection: () => void;
  onBack?: () => void; // New: Back button handler to return from validated state
  onExcludeInvalid?: () => void; // New: Exclude invalid pixels from selection (ERASE mode)
  isValidating: boolean;
  isCommitting: boolean;
  // Draft-specific props
  isDraftMode?: boolean;
  draftCount?: number;
  onUndoDraft?: () => void;
  onClearDraft?: () => void;
  // Real progress from SSE stream
  progress?: { processed: number; total: number } | null;
  // Stall detection
  isStalled?: boolean;
  // State machine props
  isSelectionChanged?: boolean;
  lastCommitFailed?: boolean;
  // Inline error display (PROMPT 44)
  lastError?: ActionError | null;
  onRetryValidate?: () => void;
}

export function InspectorPanel({
  selectedPixels,
  mode,
  selectedColor,
  currentUserId,
  validationResult,
  invalidPixels,
  pePerPixel,
  onPePerPixelChange,
  onColorSelect,
  onValidate,
  onConfirm,
  onClearSelection,
  onBack,
  onExcludeInvalid,
  isValidating,
  isCommitting,
  isDraftMode = false,
  draftCount = 0,
  onUndoDraft,
  onClearDraft,
  progress,
  isStalled = false,
  isSelectionChanged = false,
  lastCommitFailed = false,
  lastError,
  onRetryValidate,
}: InspectorPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isMobile = useIsMobile();

  const hasSelection = selectedPixels.length > 0;
  const isSinglePixel = selectedPixels.length === 1;
  const activeTab = isSinglePixel ? 'pixel' : 'area';
  const isSelectionTooLarge = selectedPixels.length > MAX_SELECTION_PIXELS;

  // Shared content for both mobile drawer and desktop panel
  const renderContent = () => (
    <>
      {/* Tabs - only show for non-PAINT modes with single pixel */}
      {mode !== 'PAINT' && (
        <Tabs value={activeTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full justify-start rounded-none border-b border-border/20 bg-transparent px-3 h-8">
            <TabsTrigger
              value="pixel"
              disabled={!isSinglePixel}
              className="text-[11px] font-medium rounded-md data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none px-2.5 h-6"
            >
              Pixel
            </TabsTrigger>
            <TabsTrigger
              value="area"
              disabled={isSinglePixel}
              className="text-[11px] font-medium rounded-md data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none px-2.5 h-6"
            >
              Area
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="pixel" className="m-0 p-3">
              {isSinglePixel && (
                <PixelTab
                  x={selectedPixels[0].x}
                  y={selectedPixels[0].y}
                  currentUserId={currentUserId}
                  hideWithdraw={true}
                />
              )}
            </TabsContent>

            <TabsContent value="area" className="m-0 p-3">
              {!isSinglePixel && (
                <AreaTab
                  pixelCount={selectedPixels.length}
                  validationResult={validationResult}
                  currentUserId={currentUserId}
                />
              )}
            </TabsContent>
          </div>
        </Tabs>
      )}

      {/* Invalid Pixels List */}
      {invalidPixels.length > 0 && (
                <InvalidPixelList 
                  invalidPixels={invalidPixels} 
                  onExcludeInvalid={onExcludeInvalid}
                  isPartialValid={validationResult?.partialValid}
                  mode={mode}
                />
      )}


      {/* Action Box */}
      <ActionBox
        mode={mode}
        selectedColor={selectedColor}
        pixelCount={selectedPixels.length}
        pePerPixel={pePerPixel}
        validationResult={validationResult}
        onPePerPixelChange={onPePerPixelChange}
        onColorSelect={onColorSelect}
        onValidate={onValidate}
        onConfirm={onConfirm}
        onBack={onBack}
        onExcludeInvalid={onExcludeInvalid}
        isValidating={isValidating}
        isCommitting={isCommitting}
        isDraftMode={isDraftMode}
        draftCount={draftCount}
        onUndoDraft={onUndoDraft}
        onClearDraft={onClearDraft}
        progress={progress}
        isStalled={isStalled}
        isSelectionChanged={isSelectionChanged}
        lastCommitFailed={lastCommitFailed}
        lastError={lastError}
        onRetryValidate={onRetryValidate}
      />
    </>
  );

  // Selection too large warning content
  const renderTooLargeWarning = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-4 gap-3">
      <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
        <AlertTriangle className="w-6 h-6 text-amber-500" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">Selection too large</p>
        <p className="text-xs text-muted-foreground mt-1">
          Max: {MAX_SELECTION_PIXELS.toLocaleString()} pixels
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Zoom in or select a smaller area
        </p>
      </div>
      <Button size="sm" variant="outline" onClick={onClearSelection} className="mt-2 touch-target">
        Clear Selection
      </Button>
    </div>
  );

  if (!hasSelection) {
    return null;
  }

  // Mobile: Use MobileActionDock instead (rendered separately in BitplaceMap)
  if (isMobile) {
    return null;
  }

  // Desktop: Selection too large
  if (isSelectionTooLarge) {
    return (
      <div className="w-72 glass border-l-0 rounded-none flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/20">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-foreground/80">
              {selectedPixels.length.toLocaleString()} pixels
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-md hover:bg-destructive/10 hover:text-destructive"
            onClick={onClearSelection}
            title="Clear selection"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
        {renderTooLargeWarning()}
      </div>
    );
  }

  // Desktop: Collapsed state
  if (isCollapsed) {
    return (
      <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10">
        <GlassPanel 
          padding="none" 
          className="rounded-l-xl rounded-r-none shadow-lg cursor-pointer hover:bg-primary/5 transition-colors"
          onClick={() => setIsCollapsed(false)}
        >
          <div className="h-14 w-8 flex items-center justify-center touch-target">
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </div>
        </GlassPanel>
      </div>
    );
  }

  // Desktop: Full panel
  return (
    <div className="w-72 glass border-l-0 rounded-none flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/20">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-foreground/80">
            {selectedPixels.length} pixel{selectedPixels.length !== 1 ? 's' : ''}
          </span>
          <span className="text-[10px] text-muted-foreground">
            selected
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-md hover:bg-destructive/10 hover:text-destructive"
            onClick={onClearSelection}
            title="Clear selection"
          >
            <X className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-md"
            onClick={() => setIsCollapsed(true)}
            title="Collapse"
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {renderContent()}
    </div>
  );
}
