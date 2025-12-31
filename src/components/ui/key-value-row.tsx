import * as React from "react";
import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";

interface KeyValueRowProps {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
}

export function KeyValueRow({
  label,
  value,
  icon: Icon,
  className,
  labelClassName,
  valueClassName,
}: KeyValueRowProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between py-2 border-b border-border/30 last:border-0",
        className
      )}
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        <span className={labelClassName}>{label}</span>
      </div>
      <div
        className={cn(
          "text-sm font-medium text-foreground",
          valueClassName
        )}
      >
        {value}
      </div>
    </div>
  );
}
