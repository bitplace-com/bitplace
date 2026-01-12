import * as React from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  helper?: string;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
  variant?: "default" | "primary" | "muted";
}

export function StatCard({
  label,
  value,
  helper,
  icon: Icon,
  className,
  variant = "default",
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        variant === "default" && "border-border/50 bg-card",
        variant === "primary" && "border-primary/20 bg-primary/5",
        variant === "muted" && "border-border/30 bg-muted/30",
        className
      )}
    >
      <div className="flex items-start gap-3">
        {Icon && (
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
              variant === "primary"
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {label}
          </p>
          <p className="mt-1 text-xl font-bold text-foreground tabular-nums">
            {value}
          </p>
          {helper && (
            <p className="mt-0.5 text-xs text-muted-foreground">{helper}</p>
          )}
        </div>
      </div>
    </div>
  );
}
