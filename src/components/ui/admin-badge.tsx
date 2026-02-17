import { PixelBadgeCheck } from '@/components/icons/custom/PixelBadgeCheck';
import { cn } from '@/lib/utils';

interface AdminBadgeProps {
  size?: 'sm' | 'md';
  className?: string;
}

export function AdminBadge({ size = 'sm', className }: AdminBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-yellow-500',
        className
      )}
      title="Admin"
    >
      <PixelBadgeCheck shine className={size === 'md' ? 'w-5 h-5' : 'w-4 h-4'} />
      <span className="text-[10px] font-semibold">Admin</span>
    </span>
  );
}
