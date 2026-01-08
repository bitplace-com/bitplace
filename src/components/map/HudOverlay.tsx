import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface HudOverlayProps {
  children: ReactNode;
  className?: string;
}

/**
 * HudOverlay is a full-screen wrapper for all HUD elements.
 * It uses pointer-events: none so map gestures pass through,
 * and children should use pointer-events: auto on interactive elements.
 */
export function HudOverlay({ children, className }: HudOverlayProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 pointer-events-none z-10",
        className
      )}
    >
      {children}
    </div>
  );
}

interface HudSlotProps {
  children: ReactNode;
  position: "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-right";
  className?: string;
}

const positionClasses: Record<HudSlotProps["position"], string> = {
  "top-left": "top-0 left-0 pt-[max(1rem,env(safe-area-inset-top))] pl-[max(1rem,env(safe-area-inset-left))]",
  "top-center": "top-0 left-1/2 -translate-x-1/2 pt-[max(1rem,env(safe-area-inset-top))]",
  "top-right": "top-0 right-0 pt-[max(1rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))]",
  "bottom-left": "bottom-0 left-0 pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))]",
  "bottom-right": "bottom-0 right-0 pb-[max(1rem,env(safe-area-inset-bottom))] pr-[max(1rem,env(safe-area-inset-right))]",
};

/**
 * HudSlot positions interactive HUD elements.
 * Has pointer-events: auto so buttons work.
 * Includes safe-area insets for iOS notch/home bar.
 */
export function HudSlot({ children, position, className }: HudSlotProps) {
  return (
    <div
      className={cn(
        "absolute pointer-events-auto",
        positionClasses[position],
        className
      )}
    >
      {children}
    </div>
  );
}
