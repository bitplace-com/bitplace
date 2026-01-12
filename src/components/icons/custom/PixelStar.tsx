import { PixelSVG, PixelSVGProps } from './base';

export function PixelStar(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <rect x="10" y="2" width="4" height="4" />
      <rect x="10" y="6" width="4" height="2" />
      <rect x="2" y="8" width="20" height="2" />
      <rect x="4" y="10" width="16" height="2" />
      <rect x="6" y="12" width="12" height="2" />
      <rect x="6" y="14" width="4" height="2" />
      <rect x="14" y="14" width="4" height="2" />
      <rect x="4" y="16" width="4" height="2" />
      <rect x="16" y="16" width="4" height="2" />
      <rect x="2" y="18" width="4" height="2" />
      <rect x="18" y="18" width="4" height="2" />
    </PixelSVG>
  );
}
