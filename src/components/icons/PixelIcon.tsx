import { cn } from '@/lib/utils';
import { icons, IconName } from './iconRegistry';

export type { IconName } from './iconRegistry';

export interface PixelIconProps {
  name: IconName;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  xs: 'h-3 w-3',      // 12px
  sm: 'h-4 w-4',      // 16px (default)
  md: 'h-5 w-5',      // 20px
  lg: 'h-6 w-6',      // 24px (native size)
  xl: 'h-8 w-8',      // 32px
};

export function PixelIcon({ name, size = 'sm', className }: PixelIconProps) {
  const IconComponent = icons[name];
  
  if (!IconComponent) {
    console.warn(`[PixelIcon] Unknown icon: ${name}`);
    return null;
  }
  
  return (
    <IconComponent 
      className={cn(sizeClasses[size], className)} 
    />
  );
}
