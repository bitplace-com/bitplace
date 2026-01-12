import { PixelSVG, PixelSVGProps } from './base';

export function PixelLoader(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <rect x="10" y="2" width="4" height="4" />
      <rect x="16" y="4" width="4" height="4" />
      <rect x="18" y="10" width="4" height="4" />
      <rect x="16" y="16" width="4" height="4" />
      <rect x="10" y="18" width="4" height="4" />
      <rect x="4" y="16" width="4" height="4" />
      <rect x="2" y="10" width="4" height="4" />
      <rect x="4" y="4" width="4" height="4" />
    </PixelSVG>
  );
}
