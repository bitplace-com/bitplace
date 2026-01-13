import { PixelSVG, PixelSVGProps } from './base';

// Eraser tool - cleaner design from HackerNoon
export function PixelEraser(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <polygon points="21 5 21 6 20 6 20 7 19 7 19 8 18 8 18 9 17 9 17 10 16 10 16 11 15 11 15 12 14 12 14 13 13 13 13 14 12 14 12 15 11 15 11 16 21 16 21 22 3 22 3 16 4 16 4 15 5 15 5 14 6 14 6 13 7 13 7 12 8 12 8 11 9 11 9 10 10 10 10 9 11 9 11 8 12 8 12 7 13 7 13 6 14 6 14 5 15 5 15 4 16 4 16 3 17 3 17 2 19 2 19 3 20 3 20 4 21 4 21 5" />
    </PixelSVG>
  );
}
