import { PixelSVG, PixelSVGProps } from './base';

export function PixelChartNetwork(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      {/* Top-left node */}
      <rect x="3" y="3" width="4" height="4" />
      {/* Top-right node */}
      <rect x="17" y="3" width="4" height="4" />
      {/* Bottom-left node */}
      <rect x="3" y="17" width="4" height="4" />
      {/* Bottom-right node */}
      <rect x="17" y="17" width="4" height="4" />
      {/* Center node */}
      <rect x="10" y="10" width="4" height="4" />
      {/* Link: center → top-left */}
      <rect x="7" y="7" width="1" height="1" />
      <rect x="8" y="8" width="1" height="1" />
      <rect x="9" y="9" width="1" height="1" />
      {/* Link: center → top-right */}
      <rect x="14" y="9" width="1" height="1" />
      <rect x="15" y="8" width="1" height="1" />
      <rect x="16" y="7" width="1" height="1" />
      {/* Link: center → bottom-left */}
      <rect x="9" y="14" width="1" height="1" />
      <rect x="8" y="15" width="1" height="1" />
      <rect x="7" y="16" width="1" height="1" />
      {/* Link: center → bottom-right */}
      <rect x="14" y="14" width="1" height="1" />
      <rect x="15" y="15" width="1" height="1" />
      <rect x="16" y="16" width="1" height="1" />
    </PixelSVG>
  );
}
