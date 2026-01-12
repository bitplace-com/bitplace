import { PixelSVG, PixelSVGProps } from './base';

export function PixelSwords(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      {/* Left sword */}
      <rect x="2" y="2" width="2" height="2" />
      <rect x="4" y="4" width="2" height="2" />
      <rect x="6" y="6" width="2" height="2" />
      <rect x="8" y="8" width="2" height="2" />
      <rect x="10" y="10" width="2" height="2" />
      <rect x="2" y="6" width="2" height="2" />
      <rect x="6" y="2" width="2" height="2" />
      {/* Right sword */}
      <rect x="20" y="2" width="2" height="2" />
      <rect x="18" y="4" width="2" height="2" />
      <rect x="16" y="6" width="2" height="2" />
      <rect x="14" y="8" width="2" height="2" />
      <rect x="12" y="10" width="2" height="2" />
      <rect x="20" y="6" width="2" height="2" />
      <rect x="16" y="2" width="2" height="2" />
      {/* Handles */}
      <rect x="2" y="18" width="4" height="4" />
      <rect x="4" y="16" width="2" height="2" />
      <rect x="18" y="18" width="4" height="4" />
      <rect x="18" y="16" width="2" height="2" />
    </PixelSVG>
  );
}
