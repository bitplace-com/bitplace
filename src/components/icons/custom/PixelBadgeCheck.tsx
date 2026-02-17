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
          <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1="-12" y1="-12" x2="0" y2="0">
            <stop offset="0%" stopColor="#b8960a" />
            <stop offset="25%" stopColor="#eab308" />
            <stop offset="40%" stopColor="#fde68a" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#fde68a" />
            <stop offset="75%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#b8960a" />
            <animate attributeName="x1" from="-12" to="24" dur="2s" repeatCount="indefinite" />
            <animate attributeName="y1" from="-12" to="24" dur="2s" repeatCount="indefinite" />
            <animate attributeName="x2" from="0" to="36" dur="2s" repeatCount="indefinite" />
            <animate attributeName="y2" from="0" to="36" dur="2s" repeatCount="indefinite" />
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
