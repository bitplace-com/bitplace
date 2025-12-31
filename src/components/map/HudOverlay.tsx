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
  "top-left": "top-4 left-4",
  "top-center": "top-4 left-1/2 -translate-x-1/2",
  "top-right": "top-4 right-4",
  "bottom-left": "bottom-4 left-4",
  "bottom-right": "bottom-4 right-4",
};

/**
 * HudSlot positions interactive HUD elements.
 * Has pointer-events: auto so buttons work.
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
