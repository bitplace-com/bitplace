import { PixelIcon } from '@/components/icons';
import { cn } from '@/lib/utils';

interface VPEIconProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

/** VPE icon — uses the outline bolt to distinguish from real PE (filled bolt) */
export function VPEIcon({ className, size = 'sm' }: VPEIconProps) {
  return <PixelIcon name="boltOutline" size={size} className={cn('text-foreground', className)} />;
}
