import { PixelSVG, PixelSVGProps } from './base';

export function PixelSingle(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <rect x="8" y="8" width="8" height="8" />
    </PixelSVG>
  );
}
