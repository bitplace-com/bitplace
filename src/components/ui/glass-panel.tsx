import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const glassPanelVariants = cva(
  "backdrop-blur-[16px] backdrop-saturate-[140%] border shadow-[0_4px_24px_rgba(0,0,0,0.06)] rounded-2xl",
  {
    variants: {
      variant: {
        default: "bg-[hsl(0_0%_97%/0.65)] border-[hsl(0_0%_70%/0.35)]",
        secondary: "bg-[hsl(252_100%_93%/0.55)] border-[hsl(0_0%_70%/0.35)]",
        solid: "bg-background/95 border-border",
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
