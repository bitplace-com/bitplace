import { PixelSVG, PixelSVGProps } from './base';

export function PixelInfo(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <rect x="8" y="2" width="8" height="2" />
      <rect x="6" y="4" width="2" height="2" />
      <rect x="16" y="4" width="2" height="2" />
      <rect x="4" y="6" width="2" height="4" />
      <rect x="18" y="6" width="2" height="4" />
      <rect x="4" y="14" width="2" height="4" />
      <rect x="18" y="14" width="2" height="4" />
      <rect x="6" y="18" width="2" height="2" />
      <rect x="16" y="18" width="2" height="2" />
      <rect x="8" y="20" width="8" height="2" />
      {/* i dot */}
      <rect x="10" y="6" width="4" height="2" />
      {/* i body */}
      <rect x="10" y="10" width="4" height="8" />
    </PixelSVG>
  );
}
