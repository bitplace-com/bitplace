import { PixelSVG, PixelSVGProps } from './base';

// Exclamation triangle icon (from HackerNoon hn-exclamation-triangle-solid)
export function PixelExclamationTriangle(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <path d="m22,20v-2h-1v-2h-1v-2h-1v-2h-1v-2h-1v-2h-1v-2h-1v-2h-1v-2h-1v-1h-2v1h-1v2h-1v2h-1v2h-1v2h-1v2h-1v2h-1v2h-1v2h-1v2h-1v2h1v1h20v-1h1v-2h-1Zm-12-9h4v3h-1v3h-2v-3h-1v-3Zm1,7h2v2h-2v-2Z" />
    </PixelSVG>
  );
}
