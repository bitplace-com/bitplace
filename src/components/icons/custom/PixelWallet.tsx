import { PixelSVG, PixelSVGProps } from './base';

export function PixelWallet(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <rect x="2" y="4" width="18" height="2" />
      <rect x="2" y="6" width="2" height="14" />
      <rect x="18" y="6" width="2" height="4" />
      <rect x="18" y="14" width="2" height="6" />
      <rect x="2" y="20" width="18" height="2" />
      <rect x="20" y="10" width="2" height="4" />
      <rect x="16" y="10" width="4" height="2" />
      <rect x="16" y="12" width="4" height="2" />
      <rect x="16" y="11" width="2" height="2" />
    </PixelSVG>
  );
}
