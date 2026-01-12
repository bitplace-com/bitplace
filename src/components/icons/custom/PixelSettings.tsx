import { PixelSVG, PixelSVGProps } from './base';

export function PixelSettings(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <rect x="10" y="2" width="4" height="2" />
      <rect x="8" y="4" width="8" height="2" />
      <rect x="2" y="8" width="2" height="8" />
      <rect x="4" y="10" width="2" height="4" />
      <rect x="18" y="10" width="2" height="4" />
      <rect x="20" y="8" width="2" height="8" />
      <rect x="8" y="18" width="8" height="2" />
      <rect x="10" y="20" width="4" height="2" />
      {/* Center gear */}
      <rect x="8" y="8" width="8" height="8" />
      <rect x="10" y="10" width="4" height="4" fill="var(--background, white)" />
    </PixelSVG>
  );
}
