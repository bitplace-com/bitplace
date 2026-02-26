import { PixelIcon } from '@/components/icons';
import { cn } from '@/lib/utils';

interface PixelBalanceIconProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

/** Pixel Balance icon — uses grid2x2 to represent the free pixel budget */
export function PixelBalanceIcon({ className, size = 'sm' }: PixelBalanceIconProps) {
  return <PixelIcon name="grid2x2" size={size} className={cn('text-foreground', className)} />;
}

/** @deprecated Use PixelBalanceIcon instead */
export const VPEIcon = PixelBalanceIcon;
