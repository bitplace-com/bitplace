import { PixelSVG, PixelSVGProps } from './base';

export function PixelSearch(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <rect x="6" y="2" width="8" height="2" />
      <rect x="4" y="4" width="2" height="2" />
      <rect x="14" y="4" width="2" height="2" />
      <rect x="2" y="6" width="2" height="8" />
      <rect x="16" y="6" width="2" height="8" />
      <rect x="4" y="14" width="2" height="2" />
      <rect x="14" y="14" width="2" height="2" />
      <rect x="6" y="16" width="8" height="2" />
      <rect x="16" y="16" width="2" height="2" />
      <rect x="18" y="18" width="2" height="2" />
      <rect x="20" y="20" width="2" height="2" />
    </PixelSVG>
  );
}
