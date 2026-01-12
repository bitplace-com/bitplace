import { PixelSVG, PixelSVGProps } from './base';

// Double check / checkcheck icon (badge check style from HackerNoon)
export function PixelCheckDouble(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      {/* First check (left) */}
      <polygon points="10 16 10 17 9 17 9 18 8 18 8 19 6 19 6 18 5 18 5 17 4 17 4 15 5 15 5 14 6 14 6 15 7 15 7 16 8 16 8 17 9 17 9 16 10 16" />
      <polygon points="14 10 14 11 13 11 13 12 12 12 12 13 11 13 11 14 10 14 10 15 9 15 9 14 8 14 8 13 9 13 9 12 10 12 10 11 11 11 11 10 12 10 12 9 13 9 13 8 14 8 14 7 15 7 15 6 16 6 16 5 18 5 18 6 17 6 17 7 16 7 16 8 15 8 15 9 14 9 14 10" />
      {/* Second check (right) */}
      <polygon points="17 16 17 17 16 17 16 18 15 18 15 19 13 19 13 18 12 18 12 17 11 17 11 15 12 15 12 14 13 14 13 15 14 15 14 16 15 16 15 17 16 17 16 16 17 16" />
      <polygon points="21 10 21 11 20 11 20 12 19 12 19 13 18 13 18 14 17 14 17 15 16 15 16 14 15 14 15 13 16 13 16 12 17 12 17 11 18 11 18 10 19 10 19 9 20 9 20 8 21 8 21 7 22 7 22 6 23 6 23 5 25 5 25 6 24 6 24 7 23 7 23 8 22 8 22 9 21 9 21 10" />
    </PixelSVG>
  );
}
