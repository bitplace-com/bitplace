import { PixelSVG, PixelSVGProps } from './base';

// Trash icon (from HackerNoon hn-trash-alt)
export function PixelTrash(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <path d="m18,5v-1h-1v-1h-1v-1h-1v-1h-6v1h-1v1h-1v1h-1v1H2v2h2v15h1v1h14v-2h1V7h1v-2h-3Zm-10-1h1v-1h6v1h1v1h-8v-1Zm10,17H6V7h12v14Z"/>
      <rect x="8" y="9" width="2" height="10"/>
      <rect x="14" y="9" width="2" height="10"/>
    </PixelSVG>
  );
}
