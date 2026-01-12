import { PixelSVG, PixelSVGProps } from './base';

export function PixelPlus(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <rect x="10" y="4" width="4" height="16" />
      <rect x="4" y="10" width="16" height="4" />
    </PixelSVG>
  );
}
