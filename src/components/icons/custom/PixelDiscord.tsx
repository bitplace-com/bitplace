import { PixelSVG, PixelSVGProps } from './base';

// Discord icon in pixel-art style
export function PixelDiscord(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <path d="M5,4h2v1h1v1h8V5h1V4h2v1h1v2h1v3h-1v2h-1v2h-1v1h-1v1h-1v1H9v-1H8v-1H7v-1H6v-2H5V9H4V6h1V4ZM9,10h2v2H9V10Zm4,0h2v2h-2V10Z" />
    </PixelSVG>
  );
}
