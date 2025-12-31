import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const glassIconButtonVariants = cva(
  "inline-flex items-center justify-center rounded-xl backdrop-blur-[12px] backdrop-saturate-[140%] border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[hsl(0_0%_97%/0.70)] border-[hsl(0_0%_70%/0.30)] hover:bg-[hsl(0_0%_97%/0.85)] hover:border-[hsl(0_0%_60%/0.40)] text-foreground",
        active:
          "bg-primary/15 border-primary/30 text-primary hover:bg-primary/20",
        ghost:
          "bg-transparent border-transparent hover:bg-[hsl(0_0%_97%/0.50)] text-foreground",
      },
      size: {
        default: "h-9 w-9",
        sm: "h-8 w-8",
        lg: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface GlassIconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof glassIconButtonVariants> {
  asChild?: boolean;
}

const GlassIconButton = React.forwardRef<HTMLButtonElement, GlassIconButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(glassIconButtonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
GlassIconButton.displayName = "GlassIconButton";

export { GlassIconButton, glassIconButtonVariants };
