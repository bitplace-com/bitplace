import { PixelSVG, PixelSVGProps } from './base';

export function PixelChart(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <rect x="2" y="4" width="2" height="16" />
      <rect x="4" y="18" width="18" height="2" />
      <rect x="6" y="14" width="4" height="4" />
      <rect x="12" y="8" width="4" height="10" />
      <rect x="18" y="6" width="4" height="12" />
    </PixelSVG>
  );
}
