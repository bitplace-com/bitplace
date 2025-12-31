import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const infoChipVariants = cva(
  "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
  {
    variants: {
      variant: {
        default: "bg-muted/50 text-foreground ring-border/50",
        primary: "bg-primary/10 text-primary ring-primary/20",
        success: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20",
        warning: "bg-amber-500/10 text-amber-600 ring-amber-500/20",
        destructive:
          "bg-destructive/10 text-destructive ring-destructive/20",
        defend: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20",
        attack: "bg-rose-500/10 text-rose-600 ring-rose-500/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface InfoChipProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof infoChipVariants> {}

export function InfoChip({ className, variant, ...props }: InfoChipProps) {
  return (
    <span className={cn(infoChipVariants({ variant }), className)} {...props} />
  );
}
