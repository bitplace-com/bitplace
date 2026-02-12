import { PixelIcon } from '@/components/icons';
import { cn } from '@/lib/utils';
import type { ProTier } from '@/lib/userBadges';

interface ProBadgeProps {
  tier: ProTier;
  size?: 'sm' | 'md';
  className?: string;
}

const tierColors: Record<ProTier, string> = {
  bronze: 'text-amber-700',
  silver: 'text-slate-400',
  gold: 'text-yellow-500',
};

export function ProBadge({ tier, size = 'sm', className }: ProBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center relative animate-shine',
        tierColors[tier],
        className
      )}
      title={`Pro ${tier.charAt(0).toUpperCase() + tier.slice(1)}`}
    >
      <PixelIcon name="pro" size={size === 'md' ? 'md' : 'sm'} />
    </span>
  );
}
