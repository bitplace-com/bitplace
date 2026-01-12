import { PixelSVG, PixelSVGProps } from './base';

// Smartphone icon (custom pixel art)
export function PixelSmartphone(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <path d="M17,1H7v1H6v20h1v1h10v-1h1V2h-1v-1Zm-1,20H8V3h8v18Z"/>
      <rect x="11" y="19" width="2" height="2"/>
    </PixelSVG>
  );
}
