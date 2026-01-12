import { PixelSVG, PixelSVGProps } from './base';

// Chevrons up/down icon (combined from chevron-up and chevron-down)
export function PixelChevronsUpDown(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      {/* Up chevron */}
      <polygon points="13 2 13 3 14 3 14 4 15 4 15 5 16 5 16 6 17 6 17 7 18 7 18 8 19 8 19 9 17 9 17 8 16 8 16 7 15 7 15 6 14 6 14 5 13 5 13 4 11 4 11 5 10 5 10 6 9 6 9 7 8 7 8 8 7 8 7 9 5 9 5 8 6 8 6 7 7 7 7 6 8 6 8 5 9 5 9 4 10 4 10 3 11 3 11 2 13 2" />
      {/* Down chevron */}
      <polygon points="13 20 13 21 14 21 14 20 15 20 15 19 16 19 16 18 17 18 17 17 18 17 18 16 19 16 19 15 17 15 17 16 16 16 16 17 15 17 15 18 14 18 14 19 13 19 13 20 11 20 11 19 10 19 10 18 9 18 9 17 8 17 8 16 7 16 7 15 5 15 5 16 6 16 6 17 7 17 7 18 8 18 8 19 9 19 9 20 10 20 10 21 11 21 11 22 13 22 13 20" />
    </PixelSVG>
  );
}
