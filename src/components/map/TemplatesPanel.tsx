import { useRef } from 'react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { GlassPanel } from '@/components/ui/glass-panel';
import { GlassSheet } from '@/components/ui/glass-sheet';
import { Button } from '@/components/ui/button';
import { PixelIcon } from '@/components/icons/PixelIcon';
import { TemplateDetailView } from './TemplateDetailView';
import type { Template, TemplateSettings } from '@/hooks/useTemplates';
import type { AutoPaintProgress } from '@/hooks/useAutoPaint';

interface TemplatesPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: Template[];
  activeTemplateId: string | null;
  isMoveMode: boolean;
  onAddTemplate: (file: File) => Promise<void>;
  onRemoveTemplate: (id: string) => void;
  onSelectTemplate: (id: string | null) => void;
  onUpdateSettings: (id: string, settings: Partial<TemplateSettings>) => void;
  onRecenter: () => void;
  onToggleMoveMode: () => void;
  // Auto-paint (admin only)
  isAdmin?: boolean;
  onAutoPaint?: () => void;
  onCancelAutoPaint?: () => void;
  autoPaintProgress?: AutoPaintProgress | null;
  isAutoPainting?: boolean;
}

function TemplateListView({
  templates,
  activeTemplateId,
  onAddTemplate,
  onSelectTemplate,
}: {
  templates: Template[];
  activeTemplateId: string | null;
  onAddTemplate: (file: File) => Promise<void>;
  onSelectTemplate: (id: string | null) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

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
            <PixelIcon name="media" size="xl" className="text-muted-foreground" />
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
              onClick={() => onSelectTemplate(template.id)}
              className={cn(
                "flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-colors",
                "hover:bg-foreground/5",
                template.id === activeTemplateId && "bg-primary/10 ring-1 ring-primary/30"
              )}
            >
              {/* Thumbnail */}
              <div className="h-12 w-12 rounded-lg bg-muted/50 overflow-hidden shrink-0">
                <img
                  src={template.objectUrl}
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

              {/* Arrow indicator */}
              <PixelIcon name="chevronRight" size="sm" className="text-muted-foreground" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TemplatesPanelContent({
  templates,
  activeTemplateId,
  isMoveMode,
  onAddTemplate,
  onRemoveTemplate,
  onSelectTemplate,
  onUpdateSettings,
  onRecenter,
  onToggleMoveMode,
  isAdmin,
  onAutoPaint,
  onCancelAutoPaint,
  autoPaintProgress,
  isAutoPainting,
}: Omit<TemplatesPanelProps, 'open' | 'onOpenChange'>) {
  const activeTemplate = templates.find(t => t.id === activeTemplateId);

  // Show detail view if template is selected
  if (activeTemplate) {
    return (
      <TemplateDetailView
        template={activeTemplate}
        onBack={() => onSelectTemplate(null)}
        onDelete={() => onRemoveTemplate(activeTemplate.id)}
        onRecenter={onRecenter}
        onUpdateSettings={(settings) => onUpdateSettings(activeTemplate.id, settings)}
        isMoveMode={isMoveMode}
        onToggleMoveMode={onToggleMoveMode}
        isAdmin={isAdmin}
        onAutoPaint={onAutoPaint}
        onCancelAutoPaint={onCancelAutoPaint}
        autoPaintProgress={autoPaintProgress}
        isAutoPainting={isAutoPainting}
      />
    );
  }

  // Show list view
  return (
    <TemplateListView
      templates={templates}
      activeTemplateId={activeTemplateId}
      onAddTemplate={onAddTemplate}
      onSelectTemplate={onSelectTemplate}
    />
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
        icon={<PixelIcon name="media" size="md" />}
        size="md"
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
            <PixelIcon name="media" size="md" className="text-primary" />
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
