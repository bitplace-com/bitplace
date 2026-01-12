import { PixelSVG, PixelSVGProps } from './base';

export function PixelChevronLeft(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <rect x="12" y="4" width="2" height="2" />
      <rect x="10" y="6" width="2" height="2" />
      <rect x="8" y="8" width="2" height="2" />
      <rect x="6" y="10" width="2" height="4" />
      <rect x="8" y="14" width="2" height="2" />
      <rect x="10" y="16" width="2" height="2" />
      <rect x="12" y="18" width="2" height="2" />
    </PixelSVG>
  );
}
