import { PixelSVG, PixelSVGProps } from './base';

export function PixelMap(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <rect x="2" y="4" width="20" height="2" />
      <rect x="2" y="6" width="2" height="12" />
      <rect x="20" y="6" width="2" height="12" />
      <rect x="2" y="18" width="20" height="2" />
      <rect x="8" y="6" width="2" height="12" />
      <rect x="14" y="6" width="2" height="12" />
      {/* Map markers */}
      <rect x="4" y="8" width="2" height="2" />
      <rect x="10" y="10" width="2" height="2" />
      <rect x="16" y="8" width="2" height="2" />
    </PixelSVG>
  );
}
