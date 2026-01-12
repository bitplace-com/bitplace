import { PixelSVG, PixelSVGProps } from './base';

export function PixelMoon(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <rect x="10" y="2" width="6" height="2" />
      <rect x="8" y="4" width="2" height="2" />
      <rect x="16" y="4" width="2" height="4" />
      <rect x="6" y="6" width="2" height="4" />
      <rect x="6" y="14" width="2" height="4" />
      <rect x="8" y="18" width="2" height="2" />
      <rect x="10" y="20" width="6" height="2" />
      <rect x="16" y="16" width="2" height="4" />
      <rect x="18" y="8" width="2" height="8" />
    </PixelSVG>
  );
}
