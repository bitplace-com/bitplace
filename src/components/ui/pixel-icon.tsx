import { cn } from "@/lib/utils";

interface PixelIconProps {
  className?: string;
}

export function PixelIcon({ className }: PixelIconProps) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="currentColor" 
      className={cn("h-4 w-4", className)}
    >
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}
