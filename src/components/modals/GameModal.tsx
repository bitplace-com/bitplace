import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface GameModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function GameModal({
  open,
  onOpenChange,
  title,
  description,
  icon,
  children,
  className,
}: GameModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "bg-[hsl(0_0%_7%/0.95)] backdrop-blur-[20px] backdrop-saturate-[140%] border-white/14 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] max-w-md",
          className
        )}
      >
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-white/10 text-white">
                {icon}
              </div>
            )}
            <DialogTitle className="text-lg font-semibold text-foreground">
              {title}
            </DialogTitle>
          </div>
          {description && (
            <DialogDescription className="text-sm text-muted-foreground">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        {children && <div className="mt-4">{children}</div>}
      </DialogContent>
    </Dialog>
  );
}
