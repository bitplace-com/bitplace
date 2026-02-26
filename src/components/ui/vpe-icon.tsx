import { PixelIcon } from '@/components/icons';
import { cn } from '@/lib/utils';

interface PixelBalanceIconProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

/** Pixel Balance icon — uses brush (pen) to represent the free pixel budget */
export function PixelBalanceIcon({ className, size = 'sm' }: PixelBalanceIconProps) {
  return <PixelIcon name="brush" size={size} className={cn('text-foreground', className)} />;
}

/** @deprecated Use PixelBalanceIcon instead */
export const VPEIcon = PixelBalanceIcon;
