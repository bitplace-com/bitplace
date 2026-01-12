import { PixelSVG, PixelSVGProps } from './base';

export function PixelMenu(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <rect x="4" y="6" width="16" height="2" />
      <rect x="4" y="11" width="16" height="2" />
      <rect x="4" y="16" width="16" height="2" />
    </PixelSVG>
  );
}
