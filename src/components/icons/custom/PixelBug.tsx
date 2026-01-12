import { PixelSVG, PixelSVGProps } from './base';

// Bug icon - robot style
export function PixelBug(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <path d="m20,6v-1h-1v-1h-1v-1h-1v-1h-2v-1h-6v1h-2v1h-1v1h-1v1h-1v1h-1v12h1v1h1v1h1v1h1v1h2v1h6v-1h2v-1h1v-1h1v-1h1v-1h1V6h-1Zm-10,13h1v1h-1v-1Zm1-5h-1v-1h1v1Zm0,2v1h-1v-1h1Zm2,4v-1h1v1h-1Zm1-6h-1v-1h1v1Zm0,2v1h-1v-1h1Zm4-7v2h-1v1h-2v-1h-1v-2h4Zm-9-5h2v2h2v-2h2v2h-2v2h-2v-2h-2v-2Zm-3,5h4v2h-1v1h-2v-1h-1v-2Z" />
    </PixelSVG>
  );
}
