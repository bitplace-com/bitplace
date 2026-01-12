import { PixelSVG, PixelSVGProps } from './base';

export function PixelUsers(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      {/* Left user */}
      <rect x="4" y="4" width="6" height="2" />
      <rect x="4" y="6" width="2" height="4" />
      <rect x="8" y="6" width="2" height="4" />
      <rect x="4" y="10" width="6" height="2" />
      <rect x="2" y="12" width="10" height="2" />
      <rect x="2" y="14" width="2" height="6" />
      <rect x="10" y="14" width="2" height="6" />
      {/* Right user */}
      <rect x="14" y="4" width="6" height="2" />
      <rect x="14" y="6" width="2" height="4" />
      <rect x="18" y="6" width="2" height="4" />
      <rect x="14" y="10" width="6" height="2" />
      <rect x="12" y="12" width="10" height="2" />
      <rect x="12" y="14" width="2" height="6" />
      <rect x="20" y="14" width="2" height="6" />
    </PixelSVG>
  );
}
