import { PixelStarter } from '@/components/icons/custom/PixelStarter';
import { cn } from '@/lib/utils';

interface StarterBadgeProps {
  shine?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function StarterBadge({ shine, size = 'sm', className }: StarterBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-slate-400',
        className
      )}
      title="Starter — Playing with free Pixels"
    >
      <PixelStarter shine={shine} className={size === 'md' ? 'w-5 h-5' : 'w-4 h-4'} />
    </span>
  );
}
