import { PixelSVG, PixelSVGProps } from './base';

export function PixelEye(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <polygon points="16 11 16 13 15 13 15 14 14 14 14 15 13 15 13 16 11 16 11 15 10 15 10 14 9 14 9 13 8 13 8 11 10 11 10 10 11 10 11 8 13 8 13 9 14 9 14 10 15 10 15 11 16 11" />
      <path d="m22,11v-2h-1v-1h-1v-1h-1v-1h-2v-1H7v1h-2v1h-1v1h-1v1h-1v2h-1v2h1v2h1v1h1v1h1v1h2v1h10v-1h2v-1h1v-1h1v-1h1v-2h1v-2h-1Zm-4,2h-1v2h-1v1h-1v1h-2v1h-2v-1h-2v-1h-1v-1h-1v-2h-1v-2h1v-2h1v-1h1v-1h2v-1h2v1h2v1h1v1h1v2h1v2Z" />
    </PixelSVG>
  );
}
