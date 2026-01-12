import { PixelSVG, PixelSVGProps } from './base';

export function PixelBug(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <rect x="8" y="2" width="8" height="2" />
      <rect x="6" y="4" width="2" height="2" />
      <rect x="16" y="4" width="2" height="2" />
      <rect x="6" y="6" width="12" height="2" />
      <rect x="4" y="8" width="2" height="2" />
      <rect x="18" y="8" width="2" height="2" />
      <rect x="2" y="10" width="4" height="2" />
      <rect x="18" y="10" width="4" height="2" />
      <rect x="6" y="8" width="12" height="8" />
      <rect x="4" y="14" width="2" height="2" />
      <rect x="18" y="14" width="2" height="2" />
      <rect x="6" y="16" width="12" height="2" />
      <rect x="6" y="18" width="2" height="2" />
      <rect x="16" y="18" width="2" height="2" />
      {/* Eyes */}
      <rect x="8" y="10" width="2" height="2" />
      <rect x="14" y="10" width="2" height="2" />
    </PixelSVG>
  );
}
