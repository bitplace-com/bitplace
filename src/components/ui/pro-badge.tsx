import { PixelPro } from '@/components/icons/custom/PixelPro';
import { cn } from '@/lib/utils';
import type { ProTier } from '@/lib/userBadges';

interface ProBadgeProps {
  tier?: ProTier;
  shine?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const tierColors: Record<ProTier, string> = {
  bronze: 'text-amber-700',
  silver: 'text-slate-400',
  gold: 'text-yellow-500',
};

export function ProBadge({ tier, shine, size = 'sm', className }: ProBadgeProps) {
  const colorClass = shine ? 'text-yellow-500' : tier ? tierColors[tier] : 'text-yellow-500';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5',
        colorClass,
        className
      )}
      title={shine ? 'PRO' : tier ? `Pro ${tier.charAt(0).toUpperCase() + tier.slice(1)}` : 'PRO'}
    >
      <PixelPro shine={shine} className={size === 'md' ? 'w-5 h-5' : 'w-4 h-4'} />
      {shine && <span className="text-[10px] font-semibold">PRO</span>}
    </span>
  );
}
