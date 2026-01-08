import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

type ModalSize = "sm" | "md" | "lg" | "xl";

interface GameModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  size?: ModalSize;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-3xl",
};

export function GameModal({
  open,
  onOpenChange,
  title,
  description,
  icon,
  children,
  className,
  size = "sm",
}: GameModalProps) {
  const isMobile = useIsMobile();

  // Mobile: use Drawer (bottom sheet)
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="pb-2">
            <div className="flex items-center gap-3">
              {icon && (
                <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/10 text-primary">
                  {icon}
                </div>
              )}
              <DrawerTitle className="text-lg font-semibold text-foreground">
                {title}
              </DrawerTitle>
            </div>
            {description && (
              <DrawerDescription className="text-sm text-muted-foreground mt-1">
                {description}
              </DrawerDescription>
            )}
          </DrawerHeader>
          {children && (
            <ScrollArea className="flex-1 px-4 pb-6 max-h-[calc(85vh-100px)]">
              {children}
            </ScrollArea>
          )}
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: use Dialog
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "bg-popover/95 backdrop-blur-[20px] backdrop-saturate-[140%] border-border rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] max-h-[80vh] flex flex-col",
          sizeClasses[size],
          className
        )}
      >
        <DialogHeader className="space-y-3 shrink-0">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/10 text-primary">
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
        {children && (
          <ScrollArea className="flex-1 mt-4 -mr-4 pr-4 max-h-[calc(80vh-120px)]">
            {children}
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
