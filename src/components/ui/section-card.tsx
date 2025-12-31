import * as React from "react";
import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

interface SectionCardProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  className?: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}

export function SectionCard({
  title,
  description,
  icon: Icon,
  className,
  children,
  collapsible = false,
  defaultOpen = true,
}: SectionCardProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  const header = (title || Icon) && (
    <div className="flex items-center gap-3 mb-4">
      {Icon && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        {title && (
          <h3 className="font-semibold text-foreground leading-none">
            {title}
          </h3>
        )}
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {collapsible && (
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      )}
    </div>
  );

  const cardContent = (
    <div
      className={cn(
        "rounded-xl border border-border/50 bg-card p-5 shadow-sm",
        className
      )}
    >
      {collapsible ? (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <button className="w-full text-left">{header}</button>
          </CollapsibleTrigger>
          <CollapsibleContent>{children}</CollapsibleContent>
        </Collapsible>
      ) : (
        <>
          {header}
          {children}
        </>
      )}
    </div>
  );

  return cardContent;
}
