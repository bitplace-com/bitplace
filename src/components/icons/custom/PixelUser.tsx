import { PixelSVG, PixelSVGProps } from './base';

export function PixelUser(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <rect x="8" y="2" width="8" height="2" />
      <rect x="8" y="4" width="2" height="6" />
      <rect x="14" y="4" width="2" height="6" />
      <rect x="8" y="10" width="8" height="2" />
      <rect x="6" y="12" width="12" height="2" />
      <rect x="4" y="14" width="4" height="2" />
      <rect x="16" y="14" width="4" height="2" />
      <rect x="4" y="16" width="2" height="6" />
      <rect x="18" y="16" width="2" height="6" />
    </PixelSVG>
  );
}
