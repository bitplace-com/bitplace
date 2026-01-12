import { PixelSVG, PixelSVGProps } from './base';

// Grid 3x3 icon (9-cell grid based on HackerNoon grid-solid)
export function PixelGrid3x3(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      {/* Row 1 */}
      <polygon points="7 2 8 2 8 7 7 7 7 8 2 8 2 7 1 7 1 2 2 2 2 1 7 1 7 2" />
      <polygon points="15 2 15 1 16 1 16 2 17 2 17 7 16 7 16 8 9 8 9 7 8 7 8 2 9 2 9 1 15 1 15 2" />
      <polygon points="23 2 23 7 22 7 22 8 17 8 17 7 16 7 16 2 17 2 17 1 22 1 22 2 23 2" />
      {/* Row 2 */}
      <polygon points="7 9 8 9 8 15 7 15 7 16 2 16 2 15 1 15 1 9 2 9 2 8 7 8 7 9" />
      <polygon points="15 9 16 9 16 8 17 8 17 15 16 15 16 16 9 16 9 15 8 15 8 9 9 9 9 8 15 8 15 9" />
      <polygon points="23 9 23 15 22 15 22 16 17 16 17 15 16 15 16 9 17 9 17 8 22 8 22 9 23 9" />
      {/* Row 3 */}
      <polygon points="7 17 8 17 8 22 7 22 7 23 2 23 2 22 1 22 1 17 2 17 2 16 7 16 7 17" />
      <polygon points="15 17 16 17 16 16 17 16 17 22 16 22 16 23 9 23 9 22 8 22 8 17 9 17 9 16 15 16 15 17" />
      <polygon points="23 17 23 22 22 22 22 23 17 23 17 22 16 22 16 17 17 17 17 16 22 16 22 17 23 17" />
    </PixelSVG>
  );
}
