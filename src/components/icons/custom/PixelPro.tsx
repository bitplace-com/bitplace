import { PixelSVG, PixelSVGProps } from './base';

export function PixelPro(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <rect x="17" y="11" width="2" height="2" />
      <rect x="11" y="10" width="1" height="2" />
      <path d="m22,5v-1H2v1h-1v14h1v1h20v-1h1V5h-1Zm-1,10h-6v-6h6v6Zm-7-3h-1v1h1v2h-2v-1h-1v1h-2v-6h5v3Zm-6-3v4h-3v2h-2v-6h5Z" />
      <rect x="5" y="10" width="1" height="2" />
    </PixelSVG>
  );
}
