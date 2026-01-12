import { PixelSVG, PixelSVGProps } from './base';

export function PixelAlert(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <rect x="10" y="2" width="4" height="2" />
      <rect x="8" y="4" width="2" height="2" />
      <rect x="14" y="4" width="2" height="2" />
      <rect x="6" y="6" width="2" height="4" />
      <rect x="16" y="6" width="2" height="4" />
      <rect x="4" y="10" width="2" height="4" />
      <rect x="18" y="10" width="2" height="4" />
      <rect x="4" y="14" width="2" height="4" />
      <rect x="18" y="14" width="2" height="4" />
      <rect x="4" y="18" width="16" height="2" />
      {/* Exclamation mark */}
      <rect x="10" y="8" width="4" height="6" />
      <rect x="10" y="16" width="4" height="2" />
    </PixelSVG>
  );
}
