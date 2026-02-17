import { PixelSVG, PixelSVGProps } from './base';

interface PixelBadgeCheckProps extends PixelSVGProps {
  shine?: boolean;
}

export function PixelBadgeCheck({ shine, ...props }: PixelBadgeCheckProps) {
  const gradientId = 'admin-shine-grad';

  return (
    <PixelSVG {...props}>
      {shine && (
        <defs>
          <linearGradient id={gradientId} x1="-1" y1="0.5" x2="0" y2="0.5">
            <stop offset="0%" stopColor="#eab308" />
            <stop offset="45%" stopColor="#eab308" />
            <stop offset="50%" stopColor="#fff" stopOpacity="0.9" />
            <stop offset="55%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#eab308" />
            <animate attributeName="x1" from="-1" to="1" dur="3s" repeatCount="indefinite" />
            <animate attributeName="x2" from="0" to="2" dur="3s" repeatCount="indefinite" />
          </linearGradient>
        </defs>
      )}
      <path
        d="m22,10v-1h-1v-4h-1v-1h-1v-1h-4v-1h-1v-1h-4v1h-1v1h-4v1h-1v1h-1v4h-1v1h-1v4h1v1h1v4h1v1h1v1h4v1h1v1h4v-1h1v-1h4v-1h1v-1h1v-4h1v-1h1v-4h-1Zm-15,1h1v-1h1v1h1v1h2v-1h1v-1h1v-1h1v-1h1v1h1v2h-1v1h-1v1h-1v1h-1v1h-1v1h-2v-1h-1v-1h-1v-1h-1v-2Z"
        fill={shine ? `url(#${gradientId})` : 'currentColor'}
      />
    </PixelSVG>
  );
}
