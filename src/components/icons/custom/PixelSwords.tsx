import { PixelSVG, PixelSVGProps } from './base';

// Crossed swords - attack mode
export function PixelSwords(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      {/* Left sword blade */}
      <polygon points="6 1 6 3 5 3 5 4 4 4 4 5 3 5 3 6 1 6 1 4 2 4 2 3 3 3 3 2 4 2 4 1 6 1" />
      <polygon points="7 4 7 6 8 6 8 7 9 7 9 8 10 8 10 10 11 10 11 11 10 11 10 12 9 12 9 13 8 13 8 14 6 14 6 16 5 16 5 18 4 18 4 20 3 20 3 22 1 22 1 20 2 20 2 18 3 18 3 16 4 16 4 14 5 14 5 12 6 12 6 10 7 10 7 8 6 8 6 7 5 7 5 6 4 6 4 4 7 4" />
      {/* Right sword blade */}
      <polygon points="18 1 18 2 20 2 20 3 21 3 21 4 22 4 22 6 23 6 23 4 22 4 22 3 21 3 21 2 20 2 20 1 18 1" />
      <polygon points="17 4 17 6 16 6 16 7 15 7 15 8 14 8 14 10 13 10 13 11 14 11 14 12 15 12 15 13 16 13 16 14 18 14 18 16 19 16 19 18 20 18 20 20 21 20 21 22 23 22 23 20 22 20 22 18 21 18 21 16 20 16 20 14 19 14 19 12 18 12 18 10 17 10 17 8 18 8 18 7 19 7 19 6 20 6 20 4 17 4" />
    </PixelSVG>
  );
}
