import { PixelSVG, PixelSVGProps } from './base';

// Skull icon - death/attacked indicator
export function PixelSkull(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <path d="m20,6v-1h-1v-1h-1v-1h-2v-1h-8v1h-2v1h-1v1h-1v1h-1v7h1v2h1v1h2v5h3v-2h1v-1h2v1h1v2h3v-5h2v-1h1v-2h1V6h-1Zm-4,8h-1v-1h-1v-4h4v4h-2v1Zm-10-1h-1v-4h4v4h-1v1h-2v-1Z" />
    </PixelSVG>
  );
}
