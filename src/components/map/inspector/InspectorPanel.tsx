import { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
        <Button
          variant="secondary"
          size="icon"
          onClick={() => setIsCollapsed(false)}
          className="rounded-l-lg rounded-r-none h-16 w-6 bg-background/95 border border-r-0 border-border"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-80 bg-background/95 backdrop-blur-sm border-l border-border flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h2 className="text-sm font-medium text-foreground">Inspector</h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onClearSelection}
          >
            <X className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsCollapsed(true)}
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent px-3">
          <TabsTrigger
            value="pixel"
            disabled={!isSinglePixel}
            className="data-[state=active]:bg-muted rounded-b-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
          >
            Pixel
          </TabsTrigger>
          <TabsTrigger
            value="area"
            disabled={isSinglePixel}
            className="data-[state=active]:bg-muted rounded-b-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
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
