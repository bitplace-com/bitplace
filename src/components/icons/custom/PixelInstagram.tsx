import { PixelSVG, PixelSVGProps } from './base';

export function PixelInstagram(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <rect x="4" y="2" width="16" height="2" />
      <rect x="2" y="4" width="2" height="16" />
      <rect x="20" y="4" width="2" height="16" />
      <rect x="4" y="20" width="16" height="2" />
      {/* Camera lens */}
      <rect x="8" y="8" width="8" height="2" />
      <rect x="8" y="14" width="8" height="2" />
      <rect x="8" y="10" width="2" height="4" />
      <rect x="14" y="10" width="2" height="4" />
      {/* Flash dot */}
      <rect x="16" y="4" width="2" height="2" />
    </PixelSVG>
  );
}
