import { PixelSVG, PixelSVGProps } from './base';

export function PixelGrid2x2(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <rect x="5" y="5" width="6" height="6" />
      <rect x="13" y="5" width="6" height="6" />
      <rect x="5" y="13" width="6" height="6" />
      <rect x="13" y="13" width="6" height="6" />
    </PixelSVG>
  );
}
