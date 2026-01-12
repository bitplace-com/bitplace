import { PixelSVG, PixelSVGProps } from './base';

// Globe Americas icon (from HackerNoon hn-globe-americas-solid)
export function PixelGlobe(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <path d="m22,9v-2h-1v-2h-1v-1h-1v-1h-2v-1h-2v-1h-6v1h-2v1h-2v1h-1v1h-1v2h-1v2h-1v6h1v2h1v2h1v1h1v1h2v1h2v1h6v-1h2v-1h2v-1h1v-1h1v-2h1v-2h1v-6h-1Zm-4,3v-3h1v-1h1v1h1v4h-2v-1h-1Zm-4,7v2h-2v-3h-1v-1h-1v-3h-1v-1h-1v-1h-1v-1h-1v-1h-1v-2h1v-1h1v-1h1v-1h3v-1h2v1h1v4h-2v2h1v1h-2v-1h-2v2h3v1h4v1h1v3h-1v2h-1Z"/>
    </PixelSVG>
  );
}
