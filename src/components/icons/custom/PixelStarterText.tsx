import { SVGProps } from 'react';
import { cn } from '@/lib/utils';

interface PixelStarterTextProps extends SVGProps<SVGSVGElement> {
  shine?: boolean;
  className?: string;
}

export function PixelStarterText({ shine, className, ...props }: PixelStarterTextProps) {
  const gradientId = 'starter-shine-grad';

  return (
    <svg
      viewBox="0 0 68 14"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      {...props}
    >
      {shine && (
        <defs>
          <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1="-20" y1="-8" x2="0" y2="0">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="25%" stopColor="#94a3b8" />
            <stop offset="40%" stopColor="#cbd5e1" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity={0.8} />
            <stop offset="60%" stopColor="#cbd5e1" />
            <stop offset="75%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#64748b" />
            <animate attributeName="x1" from="-20" to="68" dur="3.5s" repeatCount="indefinite" />
            <animate attributeName="y1" from="-8" to="16" dur="3.5s" repeatCount="indefinite" />
            <animate attributeName="x2" from="0" to="88" dur="3.5s" repeatCount="indefinite" />
            <animate attributeName="y2" from="0" to="24" dur="3.5s" repeatCount="indefinite" />
          </linearGradient>
        </defs>
      )}
      <text
        x="34"
        y="11"
        textAnchor="middle"
        fontFamily="ui-monospace, SFMono-Regular, monospace"
        fontSize="10"
        fontWeight="bold"
        letterSpacing="1.5"
        fill={shine ? `url(#${gradientId})` : 'currentColor'}
      >
        BITPLACER
      </text>
    </svg>
  );
}
