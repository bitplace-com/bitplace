import { useRef } from 'react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { GlassPanel } from '@/components/ui/glass-panel';
import { GlassSheet } from '@/components/ui/glass-sheet';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { PixelIcon } from '@/components/icons/PixelIcon';
import type { Template } from '@/hooks/useTemplates';

interface TemplatesPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: Template[];
  activeTemplateId: string | null;
  onAddTemplate: (file: File) => Promise<void>;
  onRemoveTemplate: (id: string) => void;
  onSelectTemplate: (id: string | null) => void;
  onUpdateTransform: (id: string, transform: { opacity?: number; scale?: number }) => void;
}

function TemplatesPanelContent({
  templates,
  activeTemplateId,
  onAddTemplate,
  onRemoveTemplate,
  onSelectTemplate,
  onUpdateTransform,
}: Omit<TemplatesPanelProps, 'open' | 'onOpenChange'>) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeTemplate = templates.find(t => t.id === activeTemplateId);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await onAddTemplate(file);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Add button */}
      <Button
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        className="w-full gap-2"
      >
        <PixelIcon name="plus" size="sm" />
        Add Template
      </Button>

      {/* Empty state */}
      {templates.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
            <PixelIcon name="image" size="xl" className="text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground max-w-[220px]">
            Add an overlay image to use as a guide to draw.
          </p>
          <p className="text-xs text-muted-foreground/70 mt-2">
            You'll still have to place pixels manually!
          </p>
        </div>
      )}

      {/* Templates list */}
      {templates.length > 0 && (
        <div className="flex flex-col gap-2">
          {templates.map((template) => (
            <div
              key={template.id}
              onClick={() => onSelectTemplate(template.id === activeTemplateId ? null : template.id)}
              className={cn(
                "flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-colors",
                "hover:bg-foreground/5",
                template.id === activeTemplateId && "bg-primary/10 ring-1 ring-primary/30"
              )}
            >
              {/* Thumbnail */}
              <div className="h-12 w-12 rounded-lg bg-muted/50 overflow-hidden shrink-0">
                <img
                  src={template.dataUrl}
                  alt={template.name}
                  className="h-full w-full object-cover"
                />
              </div>
              
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{template.name}</p>
                <p className="text-xs text-muted-foreground">
                  {template.width}×{template.height}
                </p>
              </div>

              {/* Delete button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveTemplate(template.id);
                }}
                className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                aria-label="Delete template"
              >
                <PixelIcon name="trash" size="sm" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Transform controls (when template selected) */}
      {activeTemplate && (
        <div className="border-t border-border pt-4 space-y-4">
          {/* Opacity slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Opacity</label>
              <span className="text-sm text-muted-foreground">{activeTemplate.opacity}%</span>
            </div>
            <Slider
              value={[activeTemplate.opacity]}
              onValueChange={([value]) => onUpdateTransform(activeTemplate.id, { opacity: value })}
              min={0}
              max={100}
              step={1}
            />
          </div>

          {/* Scale slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Scale</label>
              <span className="text-sm text-muted-foreground">{activeTemplate.scale}%</span>
            </div>
            <Slider
              value={[activeTemplate.scale]}
              onValueChange={([value]) => onUpdateTransform(activeTemplate.id, { scale: value })}
              min={1}
              max={400}
              step={1}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function TemplatesPanel({
  open,
  onOpenChange,
  ...contentProps
}: TemplatesPanelProps) {
  const isMobile = useIsMobile();

  // Mobile: Bottom sheet drawer
  if (isMobile) {
    return (
      <GlassSheet
        open={open}
        onOpenChange={onOpenChange}
        title="Templates"
        description="Overlay images as drawing guides"
        icon={<PixelIcon name="image" size="md" />}
        size="sm"
      >
        <TemplatesPanelContent {...contentProps} />
      </GlassSheet>
    );
  }

  // Desktop: Side panel
  if (!open) return null;

  return (
    <div className="absolute left-14 top-14 z-30 pointer-events-auto">
      <GlassPanel variant="hud" padding="md" className="w-[320px] max-h-[calc(100vh-120px)] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <PixelIcon name="image" size="md" className="text-primary" />
            <h3 className="font-semibold">Templates</h3>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1.5 rounded-lg hover:bg-foreground/10 transition-colors"
            aria-label="Close"
          >
            <PixelIcon name="close" size="sm" />
          </button>
        </div>
        <TemplatesPanelContent {...contentProps} />
      </GlassPanel>
    </div>
  );
}
