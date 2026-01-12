import { PixelSVG, PixelSVGProps } from './base';

export function PixelCopy(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <polygon points="16 20 16 22 15 22 15 23 3 23 3 22 2 22 2 6 3 6 3 5 6 5 6 20 16 20" />
      <polygon points="22 7 22 18 21 18 21 19 8 19 8 18 7 18 7 2 8 2 8 1 16 1 16 7 22 7" />
      <polygon points="22 5 22 6 17 6 17 1 18 1 18 2 19 2 19 3 20 3 20 4 21 4 21 5 22 5" />
    </PixelSVG>
  );
}
