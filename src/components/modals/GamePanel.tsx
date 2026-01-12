import * as React from "react";
import { GlassSheet } from "@/components/ui/glass-sheet";
import { soundEngine } from "@/lib/soundEngine";

type PanelSize = "sm" | "md" | "lg";

interface GamePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  size?: PanelSize;
  className?: string;
}

export function GamePanel({
  open,
  onOpenChange,
  title,
  description,
  icon,
  children,
  size = "md",
  className,
}: GamePanelProps) {
  // Track previous open state to detect changes
  const prevOpenRef = React.useRef(open);
  
  React.useEffect(() => {
    if (open && !prevOpenRef.current) {
      soundEngine.play('modal_open');
    } else if (!open && prevOpenRef.current) {
      soundEngine.play('modal_close');
    }
    prevOpenRef.current = open;
  }, [open]);

  return (
    <GlassSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      icon={icon}
      size={size}
      className={className}
    >
      {children}
    </GlassSheet>
  );
}
