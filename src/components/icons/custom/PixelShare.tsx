import { PixelSVG, PixelSVGProps } from './base';

// Share icon (from HackerNoon hn-share)
export function PixelShare(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <path d="m20,9v-1h1v-2h1v-2h-1v-2h-1v-1h-5v1h-1v2h-1v2h-1v1h-1v1h-1v1h-1v-1h-5v1h-1v2h-1v2h1v2h1v1h5v-1h1v1h1v1h1v1h1v2h1v2h1v1h5v-1h1v-2h1v-2h-1v-2h-1v-1h-5v1h-2v-1h-1v-1h-1v-4h1v-1h1v-1h2v1h5Zm-11,4h-1v1h-3v-1h-1v-2h1v-1h3v1h1v2Zm6,5h1v-1h3v1h1v2h-1v1h-3v-1h-1v-2Zm0-14h1v-1h3v1h1v2h-1v1h-3v-1h-1v-2Z"/>
    </PixelSVG>
  );
}
