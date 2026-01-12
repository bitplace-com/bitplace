import { PixelSVG, PixelSVGProps } from './base';

export function PixelBook(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <rect x="4" y="2" width="16" height="2" />
      <rect x="4" y="4" width="2" height="16" />
      <rect x="18" y="4" width="2" height="16" />
      <rect x="4" y="20" width="16" height="2" />
      <rect x="8" y="6" width="8" height="2" />
      <rect x="8" y="10" width="6" height="2" />
      <rect x="8" y="14" width="8" height="2" />
    </PixelSVG>
  );
}
