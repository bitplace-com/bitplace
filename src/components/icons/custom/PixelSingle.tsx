import { PixelSVG, PixelSVGProps } from './base';

// Single pixel (1x brush) - simple centered square
export function PixelSingle(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <polygon points="17 7 17 17 16 17 16 18 8 18 8 17 7 17 7 7 8 7 8 6 16 6 16 7 17 7" />
    </PixelSVG>
  );
}
