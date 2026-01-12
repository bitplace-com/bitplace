import { PixelSVG, PixelSVGProps } from './base';

export function PixelInfo(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <path d="m22,9v-2h-1v-2h-1v-1h-1v-1h-2v-1h-2v-1h-6v1h-2v1h-2v1h-1v1h-1v2h-1v2h-1v6h1v2h1v2h1v1h1v1h2v1h2v1h6v-1h2v-1h2v-1h1v-1h1v-2h1v-2h1v-6h-1Zm-11-3h2v2h-2v-2Zm-1,9h1v-5h-1v-1h3v6h1v2h-4v-2Z" />
    </PixelSVG>
  );
}
