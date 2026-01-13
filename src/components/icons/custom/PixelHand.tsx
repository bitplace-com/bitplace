import { PixelSVG, PixelSVGProps } from './base';

// Hand/drag icon - cleaner open palm design from HackerNoon
export function PixelHand(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <polygon points="11 1 11 2 10 2 10 8 8 8 8 10 7 10 7 11 6 11 6 9 5 9 5 11 4 11 4 9 3 9 3 11 2 11 2 18 3 18 3 19 4 19 4 20 5 20 5 21 7 21 7 22 17 22 17 21 18 21 18 20 19 20 19 19 20 19 20 17 21 17 21 11 20 11 20 9 18 9 18 11 17 11 17 8 16 8 16 2 15 2 15 1 11 1" />
    </PixelSVG>
  );
}
