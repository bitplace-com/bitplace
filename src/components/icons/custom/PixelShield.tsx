import { PixelSVG, PixelSVGProps } from './base';

export function PixelShield(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <rect x="4" y="2" width="16" height="2" />
      <rect x="4" y="4" width="2" height="10" />
      <rect x="18" y="4" width="2" height="10" />
      <rect x="6" y="14" width="2" height="4" />
      <rect x="16" y="14" width="2" height="4" />
      <rect x="8" y="18" width="2" height="2" />
      <rect x="14" y="18" width="2" height="2" />
      <rect x="10" y="20" width="4" height="2" />
      <rect x="10" y="6" width="4" height="2" />
      <rect x="10" y="10" width="4" height="4" />
    </PixelSVG>
  );
}
