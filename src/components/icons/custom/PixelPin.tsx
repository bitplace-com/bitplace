import { PixelSVG, PixelSVGProps } from './base';

export function PixelPin(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <rect x="8" y="2" width="8" height="2" />
      <rect x="6" y="4" width="2" height="2" />
      <rect x="16" y="4" width="2" height="2" />
      <rect x="4" y="6" width="2" height="6" />
      <rect x="18" y="6" width="2" height="6" />
      <rect x="6" y="12" width="2" height="2" />
      <rect x="16" y="12" width="2" height="2" />
      <rect x="8" y="14" width="2" height="2" />
      <rect x="14" y="14" width="2" height="2" />
      <rect x="10" y="16" width="4" height="4" />
      <rect x="10" y="20" width="4" height="2" />
      {/* Center dot */}
      <rect x="10" y="8" width="4" height="4" />
    </PixelSVG>
  );
}
