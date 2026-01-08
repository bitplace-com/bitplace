import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PEIconProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  xs: 'h-2.5 w-2.5',
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

export function PEIcon({ className, size = 'sm' }: PEIconProps) {
  return <Zap className={cn(sizeClasses[size], className)} />;
}
