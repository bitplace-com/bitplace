import { PixelSVG, PixelSVGProps } from './base';

interface PixelProProps extends PixelSVGProps {
  shine?: boolean;
}

export function PixelPro({ shine, ...props }: PixelProProps) {
  const gradientId = 'pro-shine-grad';

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
      <rect x="17" y="11" width="2" height="2" fill={shine ? `url(#${gradientId})` : 'currentColor'} />
      <rect x="11" y="10" width="1" height="2" fill={shine ? `url(#${gradientId})` : 'currentColor'} />
      <path
        d="m22,5v-1H2v1h-1v14h1v1h20v-1h1V5h-1Zm-1,10h-6v-6h6v6Zm-7-3h-1v1h1v2h-2v-1h-1v1h-2v-6h5v3Zm-6-3v4h-3v2h-2v-6h5Z"
        fill={shine ? `url(#${gradientId})` : 'currentColor'}
      />
      <rect x="5" y="10" width="1" height="2" fill={shine ? `url(#${gradientId})` : 'currentColor'} />
    </PixelSVG>
  );
}
