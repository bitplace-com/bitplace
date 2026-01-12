import { cn } from "@/lib/utils";
import { getStatusColor, getStatusBgColor } from "@/lib/progression";

interface LevelPillProps {
  level: number;
  className?: string;
  size?: "xs" | "sm" | "md";
}

export function LevelPill({ level, className, size = "sm" }: LevelPillProps) {
  return (
    <span 
      className={cn(
        "inline-flex items-center font-medium rounded-full shrink-0",
        size === "xs" && "text-[9px] px-1 py-0.5",
        size === "sm" && "text-[10px] px-1.5 py-0.5",
        size === "md" && "text-xs px-2 py-1",
        getStatusBgColor(level),
        getStatusColor(level),
        className
      )}
    >
      Lvl {level}
    </span>
  );
}
