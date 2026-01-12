import { PixelSVG, PixelSVGProps } from './base';

export function PixelRefresh(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      {/* Top arrow */}
      <rect x="10" y="2" width="6" height="2" />
      <rect x="16" y="4" width="2" height="2" />
      <rect x="18" y="6" width="2" height="6" />
      <rect x="16" y="12" width="2" height="2" />
      <rect x="14" y="6" width="2" height="2" />
      <rect x="12" y="4" width="2" height="2" />
      {/* Bottom arrow */}
      <rect x="8" y="20" width="6" height="2" />
      <rect x="6" y="18" width="2" height="2" />
      <rect x="4" y="12" width="2" height="6" />
      <rect x="6" y="10" width="2" height="2" />
      <rect x="8" y="16" width="2" height="2" />
      <rect x="10" y="18" width="2" height="2" />
    </PixelSVG>
  );
}
