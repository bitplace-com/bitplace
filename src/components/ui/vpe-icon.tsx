import { PixelIcon } from '@/components/icons';
import { cn } from '@/lib/utils';

interface VPEIconProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

/** Virtual PE icon — uses the outline bolt to distinguish from real PE (filled bolt) */
export function VPEIcon({ className, size = 'sm' }: VPEIconProps) {
  return <PixelIcon name="clock" size={size} className={cn('text-blue-500 dark:text-blue-400', className)} />;
}
