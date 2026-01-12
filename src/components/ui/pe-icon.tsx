import { PixelIcon } from '@/components/icons';
import { cn } from '@/lib/utils';

interface PEIconProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export function PEIcon({ className, size = 'sm' }: PEIconProps) {
  return <PixelIcon name="bolt" size={size} className={className} />;
}
