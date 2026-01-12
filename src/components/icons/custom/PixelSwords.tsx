import { PixelSVG, PixelSVGProps } from './base';

// Thumbs down icon - attack mode (from HackerNoon hn-thumbsdown)
export function PixelSwords(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <polygon points="6 2 6 15 2 15 2 14 1 14 1 3 2 3 2 2 6 2"/>
      <path d="m22,12v-3h-1v-3h-1v-3h-1v-1h-7v1h-2v1h-1v1h-1v9h1v1h1v1h1v2h1v3h1v1h2v-1h1v-4h-1v-2h7v-1h1v-2h-1Zm-2,1h-6v1h-1v1h-1v-1h-1v-1h-1v-7h1v-1h2v-1h5v2h1v3h1v4Z"/>
    </PixelSVG>
  );
}
