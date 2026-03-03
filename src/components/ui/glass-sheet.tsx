import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";

interface GlassSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "max-w-[480px]",
  md: "max-w-[640px]",
  lg: "max-w-[840px]",
};

export function GlassSheet({
  open,
  onOpenChange,
  children,
  title,
  description,
  icon,
  size = "md",
  className,
}: GlassSheetProps) {
  const isMobile = useIsMobile();

  // Mobile: Bottom sheet drawer
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh] glass-hud-strong">
          <DrawerHeader className="pb-3 shrink-0">
            <div className="flex items-center gap-3">
              {icon && (
                <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-primary/10 text-primary">
                  {icon}
                </div>
              )}
              <div className="flex-1">
                <DrawerTitle className="text-lg font-semibold text-foreground">
                  {title}
                </DrawerTitle>
                {description && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {description}
                  </p>
                )}
              </div>
              <DrawerClose className="rounded-full p-3 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-foreground/10 transition-colors touch-target">
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
              </DrawerClose>
            </div>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto px-4 pb-6">
            {children}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: Centered modal
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* Overlay */}
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:duration-200 data-[state=open]:duration-200"
          )}
        />

        {/* Centered content */}
        <DialogPrimitive.Content
          className={cn(
            "fixed inset-0 z-50 flex items-center justify-center p-4",
            // Disable default Radix positioning
            "!translate-x-0 !translate-y-0 !top-0 !left-0"
          )}
        >
          <div
            className={cn(
              // Size & layout
              "w-full flex flex-col",
              sizeClasses[size],
              "max-h-[85vh]",
              // Glass styling
              "glass-hud-strong",
              "rounded-2xl border border-hud-border",
              "shadow-2xl",
              // Animation
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
              "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
              "data-[state=closed]:duration-200 data-[state=open]:duration-200",
              className
            )}
            data-state={open ? "open" : "closed"}
          >
            {/* Header */}
            <div className="shrink-0 px-6 pt-6 pb-4 border-b border-hud-border/50">
              <div className="flex items-center gap-3">
                {icon && (
                  <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/10 text-primary">
                    {icon}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <DialogPrimitive.Title className="text-lg font-semibold text-foreground">
                    {title}
                  </DialogPrimitive.Title>
                  {description && (
                    <DialogPrimitive.Description className="text-sm text-muted-foreground mt-0.5">
                      {description}
                    </DialogPrimitive.Description>
                  )}
                </div>
                <DialogPrimitive.Close className="rounded-full p-2 hover:bg-foreground/10 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50">
                  <X className="h-5 w-5" />
                  <span className="sr-only">Close</span>
                </DialogPrimitive.Close>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {children}
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
