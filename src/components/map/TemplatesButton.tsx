import { cn } from '@/lib/utils';
import { PixelIcon } from '@/components/icons/PixelIcon';
import { GlassIconButton } from '@/components/ui/glass-icon-button';

interface TemplatesButtonProps {
  isOpen: boolean;
  onToggle: () => void;
  hasActiveTemplate: boolean;
}

export function TemplatesButton({ isOpen, onToggle, hasActiveTemplate }: TemplatesButtonProps) {
  return (
      <GlassIconButton
        onClick={onToggle}
        onMouseDown={(e) => e.preventDefault()}
        aria-label="Templates"
        aria-pressed={isOpen}
      className={cn(
        "relative",
        isOpen && "ring-2 ring-primary/50"
      )}
    >
      <PixelIcon name="media" size="md" />
      {/* Active indicator dot */}
      {hasActiveTemplate && (
        <span 
          className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary border-2 border-background"
          aria-hidden="true"
        />
      )}
    </GlassIconButton>
  );
}
