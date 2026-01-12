import { PixelSVG, PixelSVGProps } from './base';

export function PixelChevronUp(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <rect x="10" y="6" width="4" height="2" />
      <rect x="8" y="8" width="2" height="2" />
      <rect x="14" y="8" width="2" height="2" />
      <rect x="6" y="10" width="2" height="2" />
      <rect x="16" y="10" width="2" height="2" />
      <rect x="4" y="12" width="2" height="2" />
      <rect x="18" y="12" width="2" height="2" />
    </PixelSVG>
  );
}
