import { PixelSVG, PixelSVGProps } from './base';

// Grid 3x3 icon — 9 simple rects for crisp rendering at small sizes
export function PixelGrid3x3(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      {/* Row 1 */}
      <rect x="2" y="2" width="5" height="5" />
      <rect x="9" y="2" width="5" height="5" />
      <rect x="16" y="2" width="5" height="5" />
      {/* Row 2 */}
      <rect x="2" y="9" width="5" height="5" />
      <rect x="9" y="9" width="5" height="5" />
      <rect x="16" y="9" width="5" height="5" />
      {/* Row 3 */}
      <rect x="2" y="16" width="5" height="5" />
      <rect x="9" y="16" width="5" height="5" />
      <rect x="16" y="16" width="5" height="5" />
    </PixelSVG>
  );
}
