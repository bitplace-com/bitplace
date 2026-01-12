import { PixelSVG, PixelSVGProps } from './base';

export function PixelGlobe(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <rect x="8" y="2" width="8" height="2" />
      <rect x="6" y="4" width="2" height="2" />
      <rect x="16" y="4" width="2" height="2" />
      <rect x="4" y="6" width="2" height="4" />
      <rect x="18" y="6" width="2" height="4" />
      <rect x="2" y="10" width="20" height="2" />
      <rect x="4" y="12" width="2" height="4" />
      <rect x="18" y="12" width="2" height="4" />
      <rect x="6" y="16" width="2" height="2" />
      <rect x="16" y="16" width="2" height="2" />
      <rect x="8" y="18" width="8" height="2" />
      <rect x="10" y="4" width="4" height="2" />
      <rect x="10" y="14" width="4" height="2" />
    </PixelSVG>
  );
}
