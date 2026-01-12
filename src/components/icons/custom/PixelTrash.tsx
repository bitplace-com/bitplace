import { PixelSVG, PixelSVGProps } from './base';

export function PixelTrash(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <polygon points="20 6 20 14 19 14 19 22 18 22 18 23 6 23 6 22 5 22 5 14 4 14 4 6 20 6" />
      <polygon points="21 3 21 5 3 5 3 3 4 3 4 2 9 2 9 1 15 1 15 2 20 2 20 3 21 3" />
    </PixelSVG>
  );
}
