import { Eye, EyeOff } from "lucide-react";
import { GlassIconButton } from "@/components/ui/glass-icon-button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ArtOpacityButtonProps {
  opacity: number;
  onToggle: () => void;
}

export function ArtOpacityButton({ opacity, onToggle }: ArtOpacityButtonProps) {
  const isReduced = opacity < 1;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <GlassIconButton
          variant={isReduced ? "active" : "default"}
          size="default"
          onClick={onToggle}
          aria-label={isReduced ? "Show art" : "Reduce art opacity"}
        >
          {isReduced ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </GlassIconButton>
      </TooltipTrigger>
      <TooltipContent side="left">
        {isReduced ? "Show pixel art" : "Reduce pixel art opacity"}
      </TooltipContent>
    </Tooltip>
  );
}
