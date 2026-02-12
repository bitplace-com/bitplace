import { PixelIcon } from '@/components/icons';
import { cn } from '@/lib/utils';

interface AdminBadgeProps {
  size?: 'sm' | 'md';
  className?: string;
}

export function AdminBadge({ size = 'sm', className }: AdminBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-violet-500',
        className
      )}
      title="Admin"
    >
      <PixelIcon name="badgeCheck" size={size === 'md' ? 'md' : 'sm'} />
      <span className="text-[10px] font-semibold">Admin</span>
    </span>
  );
}
