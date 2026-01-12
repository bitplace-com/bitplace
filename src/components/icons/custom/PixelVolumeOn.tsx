import { PixelSVG, PixelSVGProps } from './base';

export function PixelVolumeOn(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <polygon points="13 3 13 6 12 6 12 7 11 7 11 8 9 8 9 9 5 9 5 16 9 16 9 17 11 17 11 18 12 18 12 19 13 19 13 22 11 22 11 21 10 21 10 20 9 20 9 19 8 19 8 18 3 18 3 7 8 7 8 6 9 6 9 5 10 5 10 4 11 4 11 3 13 3" />
      <rect x="15" y="11" width="2" height="3" />
      <polygon points="21 8 21 10 20 10 20 11 19 11 19 14 20 14 20 15 21 15 21 17 19 17 19 16 18 16 18 15 17 15 17 10 18 10 18 9 19 9 19 8 21 8" />
    </PixelSVG>
  );
}
