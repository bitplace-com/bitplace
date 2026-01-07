import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const glassIconButtonVariants = cva(
  "inline-flex items-center justify-center rounded-xl backdrop-blur-[12px] backdrop-saturate-[140%] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-card/70 dark:bg-card/80 hover:bg-accent text-foreground",
        active:
          "bg-primary/15 text-primary dark:bg-primary/25",
        ghost:
          "bg-transparent hover:bg-accent text-foreground",
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
