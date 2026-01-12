import { PixelSVG, PixelSVGProps } from './base';

export function PixelSkull(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <rect x="6" y="2" width="12" height="2" />
      <rect x="4" y="4" width="2" height="2" />
      <rect x="18" y="4" width="2" height="2" />
      <rect x="2" y="6" width="2" height="8" />
      <rect x="20" y="6" width="2" height="8" />
      <rect x="4" y="14" width="2" height="2" />
      <rect x="18" y="14" width="2" height="2" />
      <rect x="6" y="16" width="4" height="2" />
      <rect x="14" y="16" width="4" height="2" />
      <rect x="8" y="18" width="2" height="4" />
      <rect x="14" y="18" width="2" height="4" />
      <rect x="10" y="18" width="4" height="2" />
      {/* Eyes */}
      <rect x="6" y="8" width="4" height="4" />
      <rect x="14" y="8" width="4" height="4" />
    </PixelSVG>
  );
}
