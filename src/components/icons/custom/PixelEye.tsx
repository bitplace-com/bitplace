import { PixelSVG, PixelSVGProps } from './base';

export function PixelEye(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <rect x="6" y="8" width="12" height="2" />
      <rect x="4" y="10" width="4" height="4" />
      <rect x="16" y="10" width="4" height="4" />
      <rect x="8" y="10" width="8" height="4" />
      <rect x="6" y="14" width="12" height="2" />
      <rect x="10" y="10" width="4" height="4" fill="var(--background, white)" />
      <rect x="11" y="11" width="2" height="2" />
    </PixelSVG>
  );
}
