import { PixelSVG, PixelSVGProps } from './base';

export function PixelBolt(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <rect x="12" y="2" width="6" height="2" />
      <rect x="10" y="4" width="6" height="2" />
      <rect x="8" y="6" width="6" height="2" />
      <rect x="6" y="8" width="10" height="2" />
      <rect x="10" y="10" width="6" height="2" />
      <rect x="10" y="12" width="6" height="2" />
      <rect x="8" y="14" width="6" height="2" />
      <rect x="6" y="16" width="6" height="2" />
      <rect x="4" y="18" width="6" height="2" />
      <rect x="6" y="20" width="4" height="2" />
    </PixelSVG>
  );
}
