import { cn } from '@/lib/utils';

interface StarterBadgeProps {
  className?: string;
}

export function StarterBadge({ className }: StarterBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[10px] font-medium leading-none',
        className
      )}
      title="Starter — Playing with Virtual Paint Energy"
    >
      Starter
    </span>
  );
}
