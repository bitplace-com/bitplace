import { PixelSVG, PixelSVGProps } from './base';

export function PixelCart(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <rect x="2" y="4" width="4" height="2" />
      <rect x="6" y="6" width="14" height="2" />
      <rect x="6" y="8" width="2" height="6" />
      <rect x="18" y="8" width="2" height="4" />
      <rect x="8" y="12" width="10" height="2" />
      <rect x="8" y="14" width="10" height="2" />
      <rect x="6" y="18" width="4" height="4" />
      <rect x="14" y="18" width="4" height="4" />
    </PixelSVG>
  );
}
