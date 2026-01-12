import { PixelSVG, PixelSVGProps } from './base';

// Eraser tool
export function PixelEraser(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <polygon points="23 5 23 7 22 7 22 8 21 8 21 9 20 9 20 10 19 10 19 11 18 11 18 12 17 12 17 13 16 13 16 14 15 14 15 15 14 15 14 16 13 16 13 17 21 17 21 21 20 21 20 22 3 22 3 21 2 21 2 17 3 17 3 16 4 16 4 15 5 15 5 14 6 14 6 13 7 13 7 12 8 12 8 11 9 11 9 10 10 10 10 9 11 9 11 8 12 8 12 7 13 7 13 6 14 6 14 5 15 5 15 4 16 4 16 3 17 3 17 2 18 2 18 1 20 1 20 2 21 2 21 3 22 3 22 4 23 4 23 5" />
    </PixelSVG>
  );
}
