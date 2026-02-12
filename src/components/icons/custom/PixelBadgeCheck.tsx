import { PixelSVG, PixelSVGProps } from './base';

export function PixelBadgeCheck(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <path d="m22,10v-1h-1v-4h-1v-1h-1v-1h-4v-1h-1v-1h-4v1h-1v1h-4v1h-1v1h-1v4h-1v1h-1v4h1v1h1v4h1v1h1v1h4v1h1v1h4v-1h1v-1h4v-1h1v-1h1v-4h1v-1h1v-4h-1Zm-15,1h1v-1h1v1h1v1h2v-1h1v-1h1v-1h1v-1h1v1h1v2h-1v1h-1v1h-1v1h-1v1h-1v1h-2v-1h-1v-1h-1v-1h-1v-2Z" />
    </PixelSVG>
  );
}
