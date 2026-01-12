import { PixelSVG, PixelSVGProps } from './base';

// Map icon - using globe-americas style segments
export function PixelMap(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <polygon points="22 3 22 5 21 5 21 6 20 6 20 7 21 7 21 21 20 21 20 22 4 22 4 21 3 21 3 7 4 7 4 6 3 6 3 5 2 5 2 3 3 3 3 2 9 2 9 3 8 3 8 7 9 7 9 3 15 3 15 7 16 7 16 3 21 3 21 2 22 2 22 3" />
      <polygon points="8 9 8 19 9 19 9 9 8 9" />
      <polygon points="15 9 15 19 16 19 16 9 15 9" />
    </PixelSVG>
  );
}
