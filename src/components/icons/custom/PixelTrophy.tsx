import { PixelSVG, PixelSVGProps } from './base';

export function PixelTrophy(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <rect x="4" y="2" width="16" height="2" />
      <rect x="4" y="4" width="2" height="6" />
      <rect x="18" y="4" width="2" height="6" />
      <rect x="2" y="4" width="2" height="4" />
      <rect x="20" y="4" width="2" height="4" />
      <rect x="6" y="10" width="2" height="2" />
      <rect x="16" y="10" width="2" height="2" />
      <rect x="8" y="12" width="8" height="2" />
      <rect x="10" y="14" width="4" height="4" />
      <rect x="6" y="18" width="12" height="2" />
      <rect x="6" y="20" width="12" height="2" />
    </PixelSVG>
  );
}
