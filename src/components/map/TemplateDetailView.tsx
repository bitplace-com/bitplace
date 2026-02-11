import { useState, useMemo } from 'react';
import { Hand } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { PixelIcon } from '@/components/icons/PixelIcon';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { getGuideDimensions } from '@/lib/paletteQuantizer';
import type { Template, TemplateSettings } from '@/hooks/useTemplates';

interface TemplateDetailViewProps {
  template: Template;
  onBack: () => void;
  onDelete: () => void;
  onRecenter: () => void;
  onUpdateSettings: (settings: Partial<TemplateSettings>) => void;
  isMoveMode: boolean;
  onToggleMoveMode: () => void;
}

export function TemplateDetailView({
  template,
  onBack,
  onDelete,
  onRecenter,
  onUpdateSettings,
  isMoveMode,
  onToggleMoveMode,
}: TemplateDetailViewProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Calculate guide dimensions
  const guideDimensions = useMemo(() => {
    return getGuideDimensions(template.width, template.height, template.scale);
  }, [template.width, template.height, template.scale]);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-foreground/10 transition-colors"
          aria-label="Back"
        >
          <PixelIcon name="arrowLeft" size="sm" />
        </button>
        
        {/* Thumbnail */}
        <div className="h-10 w-10 rounded-lg bg-muted/50 overflow-hidden shrink-0">
          <img
            src={template.objectUrl}
            alt={template.name}
            className="h-full w-full object-cover"
          />
        </div>
        
        {/* Name + dimensions */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{template.name}</p>
          <p className="text-xs text-muted-foreground">
            {guideDimensions.width} × {guideDimensions.height}
          </p>
        </div>
        
        {/* Delete button */}
        <button
          onClick={onDelete}
          className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          aria-label="Delete template"
        >
          <PixelIcon name="trash" size="sm" />
        </button>
      </div>

      {/* Mode Tabs */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
        <button
          onClick={() => onUpdateSettings({ mode: 'image' })}
          className={cn(
            "flex-1 px-3 py-2 text-sm rounded-md transition-colors",
            template.mode === 'image'
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Image
        </button>
        <button
          onClick={() => onUpdateSettings({ mode: 'pixelGuide' })}
          className={cn(
            "flex-1 px-3 py-2 text-sm rounded-md transition-colors",
            template.mode === 'pixelGuide'
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Pixel Guide
        </button>
      </div>

      {/* Recenter Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onRecenter}
        className="w-full gap-2"
      >
        <PixelIcon name="navigation" size="sm" />
        Recenter
      </Button>

      {/* Position Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Position</label>
          <Button
            variant={isMoveMode ? 'default' : 'outline'}
            size="sm"
            onClick={onToggleMoveMode}
            className="h-8 gap-1.5"
          >
            <Hand className="h-4 w-4" />
            Move
          </Button>
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">X</label>
            <Input
              type="number"
              value={template.positionX}
              onChange={(e) => onUpdateSettings({ x: parseInt(e.target.value) || 0 })}
              className="h-8 text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">Y</label>
            <Input
              type="number"
              value={template.positionY}
              onChange={(e) => onUpdateSettings({ y: parseInt(e.target.value) || 0 })}
              className="h-8 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Transform Section */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium">Transform</h4>
        
        {/* Scale slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">Scale</label>
            <span className="text-xs font-mono tabular-nums">{template.scale}%</span>
          </div>
          <Slider
            value={[template.scale]}
            onValueChange={([value]) => onUpdateSettings({ scale: value })}
            min={1}
            max={400}
            step={1}
          />
        </div>

        {/* Opacity slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">Opacity</label>
            <span className="text-xs font-mono tabular-nums">{template.opacity}%</span>
          </div>
          <Slider
            value={[template.opacity]}
            onValueChange={([value]) => onUpdateSettings({ opacity: value })}
            min={0}
            max={100}
            step={1}
          />
        </div>

        {/* Rotation slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">Rotation</label>
            <span className="text-xs font-mono tabular-nums">{template.rotation}°</span>
          </div>
          <Slider
            value={[template.rotation]}
            onValueChange={([value]) => onUpdateSettings({ rotation: value })}
            min={0}
            max={360}
            step={1}
          />
        </div>
      </div>

      {/* Quick Settings (Collapsible) */}
      <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:text-primary transition-colors">
          <span>Quick Settings</span>
          <PixelIcon 
            name={settingsOpen ? 'chevronUp' : 'chevronDown'} 
            size="sm" 
            className="text-muted-foreground"
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-2">
          <TooltipProvider delayDuration={300}>
            {/* Highlight selected color */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <label className="text-sm text-muted-foreground">Highlight selected color</label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      type="button"
                      className="text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                    >
                      <PixelIcon name="info" size="xs" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]">
                    Shows only the selected palette color at full opacity, dimming others to help you focus on painting one color at a time
                  </TooltipContent>
                </Tooltip>
              </div>
              <Switch
                checked={template.highlightSelectedColor}
                onCheckedChange={(checked) => onUpdateSettings({ highlightSelectedColor: checked })}
              />
            </div>
            
            {/* Filter colors when painting */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <label className="text-sm text-muted-foreground">Filter palette colors</label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      type="button"
                      className="text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                    >
                      <PixelIcon name="info" size="xs" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]">
                    Shows only the colors used in the template in the color palette, making it faster to pick the right color
                  </TooltipContent>
                </Tooltip>
              </div>
              <Switch
                checked={template.filterPaletteColors}
                onCheckedChange={(checked) => onUpdateSettings({ filterPaletteColors: checked })}
              />
            </div>
            
            {/* Show template above pixels */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <label className="text-sm text-muted-foreground">Show above pixels</label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      type="button"
                      className="text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                    >
                      <PixelIcon name="info" size="xs" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]">
                    Displays the template overlay above painted pixels instead of behind them
                  </TooltipContent>
                </Tooltip>
              </div>
              <Switch
                checked={template.showAbovePixels}
                onCheckedChange={(checked) => onUpdateSettings({ showAbovePixels: checked })}
              />
            </div>
          </TooltipProvider>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
