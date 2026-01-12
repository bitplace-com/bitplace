import { SVGProps } from 'react';
import { cn } from '@/lib/utils';

export interface PixelSVGProps extends SVGProps<SVGSVGElement> {
  className?: string;
}

// Base wrapper for all pixel icons with crispEdges rendering
export function PixelSVG({ children, className, ...props }: PixelSVGProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      style={{ shapeRendering: 'crispEdges' }}
      {...props}
    >
      {children}
    </svg>
  );
}
