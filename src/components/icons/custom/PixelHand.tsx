import { PixelSVG, PixelSVGProps } from './base';

// Hand/drag icon - keeping custom simple style for clarity
export function PixelHand(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <polygon points="11 2 11 8 9 8 9 12 7 12 7 10 5 10 5 12 3 12 3 18 4 18 4 19 5 19 5 20 6 20 6 21 8 21 8 22 18 22 18 21 19 21 19 20 20 20 20 18 21 18 21 12 19 12 19 10 17 10 17 12 15 12 15 8 13 8 13 2 11 2" />
    </PixelSVG>
  );
}
