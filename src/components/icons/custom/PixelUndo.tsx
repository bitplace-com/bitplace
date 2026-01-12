import { PixelSVG, PixelSVGProps } from './base';

export function PixelUndo(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <rect x="4" y="8" width="2" height="2" />
      <rect x="6" y="6" width="2" height="2" />
      <rect x="8" y="4" width="6" height="2" />
      <rect x="14" y="6" width="2" height="2" />
      <rect x="16" y="8" width="2" height="4" />
      <rect x="14" y="12" width="2" height="2" />
      <rect x="8" y="14" width="6" height="2" />
      <rect x="6" y="12" width="2" height="2" />
      <rect x="2" y="10" width="4" height="2" />
    </PixelSVG>
  );
}
