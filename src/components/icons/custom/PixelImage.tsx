import { PixelSVG, PixelSVGProps } from './base';

export function PixelImage(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      {/* Frame */}
      <rect x="3" y="4" width="18" height="16" fill="none" stroke="currentColor" strokeWidth="2" />
      {/* Sun/circle top-right */}
      <rect x="15" y="7" width="2" height="2" fill="currentColor" />
      <rect x="14" y="8" width="1" height="1" fill="currentColor" />
      <rect x="17" y="8" width="1" height="1" fill="currentColor" />
      <rect x="15" y="9" width="2" height="1" fill="currentColor" />
      {/* Mountain left */}
      <rect x="5" y="16" width="2" height="2" fill="currentColor" />
      <rect x="6" y="14" width="2" height="2" fill="currentColor" />
      <rect x="7" y="12" width="2" height="2" fill="currentColor" />
      <rect x="8" y="14" width="2" height="2" fill="currentColor" />
      <rect x="9" y="16" width="2" height="2" fill="currentColor" />
      {/* Mountain right */}
      <rect x="11" y="16" width="2" height="2" fill="currentColor" />
      <rect x="12" y="14" width="2" height="2" fill="currentColor" />
      <rect x="13" y="12" width="2" height="2" fill="currentColor" />
      <rect x="14" y="10" width="2" height="2" fill="currentColor" />
      <rect x="15" y="12" width="2" height="2" fill="currentColor" />
      <rect x="16" y="14" width="2" height="2" fill="currentColor" />
      <rect x="17" y="16" width="2" height="2" fill="currentColor" />
    </PixelSVG>
  );
}
