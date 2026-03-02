import { PixelSVG, PixelSVGProps } from './base';

interface PixelStarterProps extends PixelSVGProps {
  shine?: boolean;
}

export function PixelStarter({ shine, ...props }: PixelStarterProps) {
  const gradientId = 'starter-shine-grad';

  return (
    <PixelSVG {...props}>
      {shine && (
        <defs>
          <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1="-12" y1="-12" x2="0" y2="0">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="25%" stopColor="#94a3b8" />
            <stop offset="40%" stopColor="#cbd5e1" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#cbd5e1" />
            <stop offset="75%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#64748b" />
            <animate attributeName="x1" from="-12" to="24" dur="2s" repeatCount="indefinite" />
            <animate attributeName="y1" from="-12" to="24" dur="2s" repeatCount="indefinite" />
            <animate attributeName="x2" from="0" to="36" dur="2s" repeatCount="indefinite" />
            <animate attributeName="y2" from="0" to="36" dur="2s" repeatCount="indefinite" />
          </linearGradient>
        </defs>
      )}
      {/* Pixel-art brush/pen icon */}
      <path
        d="M18,3h2v1h1v1h1v2h-1v1h-1v1h-1v1h-1v1h-1v1h-1v1h-1v1H14v1H13v1H12v1H11v1H10v1H9v1H7v-1H6v-1H5v-2h1v-1h1v-1h1v-1h1v-1h1v-1h1v-1h1v-1h1v-1h1V9h1V8h1V7h1V6h1V5h-1V4h1V3Z"
        fill={shine ? `url(#${gradientId})` : 'currentColor'}
      />
      <rect x="4" y="18" width="3" height="3" rx="0" fill={shine ? `url(#${gradientId})` : 'currentColor'} />
    </PixelSVG>
  );
}
