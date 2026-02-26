import { PixelSVG, PixelSVGProps } from './base';

// Grid 3x3 icon — 9 rects, 6x6 cells, 2px gap, 1px margin, perfectly centered
export function PixelGrid3x3(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      {/* Row 1 */}
      <rect x="1" y="1" width="6" height="6" />
      <rect x="9" y="1" width="6" height="6" />
      <rect x="17" y="1" width="6" height="6" />
      {/* Row 2 */}
      <rect x="1" y="9" width="6" height="6" />
      <rect x="9" y="9" width="6" height="6" />
      <rect x="17" y="9" width="6" height="6" />
      {/* Row 3 */}
      <rect x="1" y="17" width="6" height="6" />
      <rect x="9" y="17" width="6" height="6" />
      <rect x="17" y="17" width="6" height="6" />
    </PixelSVG>
  );
}
