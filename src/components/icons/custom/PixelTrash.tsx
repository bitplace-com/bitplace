import { PixelSVG, PixelSVGProps } from './base';

// Trash icon SOLID (from HackerNoon hn-trash-alt-solid)
export function PixelTrash(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <polygon points="22 3 22 5 2 5 2 3 8 3 8 2 9 2 9 1 15 1 15 2 16 2 16 3 22 3"/>
      <path d="m4,7v15h1v1h14v-2h1V7H4Zm12,12h-2v-10h2v10Zm-6,0h-2v-10h2v10Z"/>
    </PixelSVG>
  );
}
