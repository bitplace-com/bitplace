import * as React from "react";
import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  className?: string;
  children?: React.ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  className,
  children,
}: PageHeaderProps) {
  return (
    <div className={cn("mb-8", className)}>
      <div className="flex items-start gap-4">
        {Icon && (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Icon className="h-6 w-6" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-muted-foreground leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
        {children && <div className="shrink-0">{children}</div>}
      </div>
    </div>
  );
}
