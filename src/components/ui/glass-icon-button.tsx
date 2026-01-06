import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const glassIconButtonVariants = cva(
  "inline-flex items-center justify-center rounded-xl backdrop-blur-[12px] backdrop-saturate-[140%] border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[rgba(255,255,255,0.06)] border-[rgba(255,255,255,0.14)] hover:bg-[rgba(255,255,255,0.12)] text-foreground",
        active:
          "bg-white/15 border-white/30 text-white",
        ghost:
          "bg-transparent border-transparent hover:bg-[rgba(255,255,255,0.08)] text-foreground",
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
