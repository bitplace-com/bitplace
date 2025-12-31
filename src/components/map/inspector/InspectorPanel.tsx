import { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GlassPanel } from '@/components/ui/glass-panel';
import { PixelTab } from './PixelTab';
import { AreaTab } from './AreaTab';
import { ActionBox } from './ActionBox';
import { InvalidPixelList } from './InvalidPixelList';
import type { GameMode, ValidateResult, InvalidPixel } from '@/hooks/useGameActions';

interface InspectorPanelProps {
  selectedPixels: { x: number; y: number }[];
  mode: GameMode;
  selectedColor: string;
  currentUserId?: string;
  validationResult: ValidateResult | null;
  invalidPixels: InvalidPixel[];
  pePerPixel: number;
  onPePerPixelChange: (value: number) => void;
  onColorSelect: (color: string) => void;
  onValidate: () => void;
  onConfirm: () => void;
  onClearSelection: () => void;
  isValidating: boolean;
  isCommitting: boolean;
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
  isValidating,
  isCommitting,
}: InspectorPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const hasSelection = selectedPixels.length > 0;
  const isSinglePixel = selectedPixels.length === 1;
  const activeTab = isSinglePixel ? 'pixel' : 'area';

  if (!hasSelection) {
    return null;
  }

  if (isCollapsed) {
    return (
      <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10">
        <GlassPanel 
          padding="none" 
          className="rounded-l-xl rounded-r-none shadow-lg cursor-pointer hover:bg-primary/5 transition-colors"
          onClick={() => setIsCollapsed(false)}
        >
          <div className="h-16 w-7 flex items-center justify-center">
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </div>
        </GlassPanel>
      </div>
    );
  }

  return (
    <div className="w-80 glass border-l-0 rounded-none flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/30">
        <h2 className="text-sm font-semibold text-foreground tracking-tight">Inspector</h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg hover:bg-destructive/10 hover:text-destructive"
            onClick={onClearSelection}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg"
            onClick={() => setIsCollapsed(true)}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-full justify-start rounded-none border-b border-border/30 bg-transparent px-4 h-10">
          <TabsTrigger
            value="pixel"
            disabled={!isSinglePixel}
            className="text-xs font-medium rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none px-3"
          >
            Pixel
          </TabsTrigger>
          <TabsTrigger
            value="area"
            disabled={isSinglePixel}
            className="text-xs font-medium rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none px-3"
          >
            Area
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto">
          <TabsContent value="pixel" className="m-0 p-4">
            {isSinglePixel && (
              <PixelTab
                x={selectedPixels[0].x}
                y={selectedPixels[0].y}
                currentUserId={currentUserId}
              />
            )}
          </TabsContent>

          <TabsContent value="area" className="m-0 p-4">
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

      {/* Invalid Pixels List */}
      {invalidPixels.length > 0 && (
        <InvalidPixelList invalidPixels={invalidPixels} />
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
        isValidating={isValidating}
        isCommitting={isCommitting}
      />
    </div>
  );
}
