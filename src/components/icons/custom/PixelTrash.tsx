import { PixelSVG, PixelSVGProps } from './base';

export function PixelTrash(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <rect x="8" y="2" width="8" height="2" />
      <rect x="4" y="4" width="16" height="2" />
      <rect x="6" y="6" width="12" height="2" />
      <rect x="6" y="8" width="2" height="12" />
      <rect x="16" y="8" width="2" height="12" />
      <rect x="6" y="20" width="12" height="2" />
      <rect x="10" y="10" width="2" height="8" />
      <rect x="12" y="10" width="2" height="8" />
    </PixelSVG>
  );
}
