import { PixelSVG, PixelSVGProps } from './base';

export function PixelChevronDown(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <rect x="4" y="10" width="2" height="2" />
      <rect x="18" y="10" width="2" height="2" />
      <rect x="6" y="12" width="2" height="2" />
      <rect x="16" y="12" width="2" height="2" />
      <rect x="8" y="14" width="2" height="2" />
      <rect x="14" y="14" width="2" height="2" />
      <rect x="10" y="16" width="4" height="2" />
    </PixelSVG>
  );
}
