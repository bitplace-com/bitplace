import { PixelSVG, PixelSVGProps } from './base';

export function PixelEraser(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <rect x="14" y="4" width="6" height="4" />
      <rect x="12" y="8" width="6" height="4" />
      <rect x="10" y="12" width="6" height="4" />
      <rect x="4" y="16" width="12" height="4" />
      <rect x="4" y="14" width="6" height="2" />
    </PixelSVG>
  );
}
