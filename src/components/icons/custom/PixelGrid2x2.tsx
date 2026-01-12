import { PixelSVG, PixelSVGProps } from './base';

export function PixelGrid2x2(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <polygon points="10 14 11 14 11 22 10 22 10 23 2 23 2 22 1 22 1 14 2 14 2 13 10 13 10 14" />
      <polygon points="10 2 11 2 11 10 10 10 10 11 2 11 2 10 1 10 1 2 2 2 2 1 10 1 10 2" />
      <polygon points="22 14 23 14 23 22 22 22 22 23 14 23 14 22 13 22 13 14 14 14 14 13 22 13 22 14" />
      <polygon points="23 2 23 10 22 10 22 11 14 11 14 10 13 10 13 2 14 2 14 1 22 1 22 2 23 2" />
    </PixelSVG>
  );
}
