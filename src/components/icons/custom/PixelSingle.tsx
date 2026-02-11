import { PixelSVG, PixelSVGProps } from './base';

// Single pixel (1x brush) - simple centered square
export function PixelSingle(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <polygon points="17 8 17 16 16 16 16 17 8 17 8 16 7 16 7 8 8 8 8 7 16 7 16 8 17 8" />
    </PixelSVG>
  );
}
