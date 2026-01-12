import { PixelSVG, PixelSVGProps } from './base';

export function PixelMenu(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <polygon points="22 11 23 11 23 13 22 13 22 14 2 14 2 13 1 13 1 11 2 11 2 10 22 10 22 11" />
      <polygon points="22 19 23 19 23 21 22 21 22 22 2 22 2 21 1 21 1 19 2 19 2 18 22 18 22 19" />
      <polygon points="23 3 23 5 22 5 22 6 2 6 2 5 1 5 1 3 2 3 2 2 22 2 22 3 23 3" />
    </PixelSVG>
  );
}
