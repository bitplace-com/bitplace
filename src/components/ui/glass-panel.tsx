import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const glassPanelVariants = cva(
  "backdrop-blur-[16px] backdrop-saturate-[140%] border shadow-[0_8px_32px_rgba(0,0,0,0.4)] rounded-2xl",
  {
    variants: {
      variant: {
        default: "bg-[rgba(255,255,255,0.06)] border-[rgba(255,255,255,0.14)]",
        strong: "bg-[rgba(255,255,255,0.10)] border-[rgba(255,255,255,0.22)]",
        solid: "bg-[hsl(0_0%_7%)] border-[rgba(255,255,255,0.14)]",
      },
      padding: {
        none: "",
        sm: "p-2",
        md: "p-3",
        lg: "p-4",
      },
    },
    defaultVariants: {
      variant: "default",
      padding: "md",
    },
  }
);

export interface GlassPanelProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof glassPanelVariants> {
  as?: React.ElementType;
}

const GlassPanel = React.forwardRef<HTMLDivElement, GlassPanelProps>(
  ({ className, variant, padding, as: Component = "div", ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn(glassPanelVariants({ variant, padding }), className)}
        {...props}
      />
    );
  }
);
GlassPanel.displayName = "GlassPanel";

export { GlassPanel, glassPanelVariants };
