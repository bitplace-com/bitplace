import { PixelSVG, PixelSVGProps } from './base';

// User minus icon (based on user-plus, with minus instead of plus)
export function PixelUserMinus(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      {/* Minus symbol in top right */}
      <polygon points="23 10 23 12 22 12 22 13 15 13 15 12 14 12 14 10 15 10 15 9 22 9 22 10 23 10" />
      {/* User head */}
      <polygon points="13 6 13 9 12 9 12 11 10 11 10 12 7 12 7 11 5 11 5 9 4 9 4 6 5 6 5 4 7 4 7 3 10 3 10 4 12 4 12 6 13 6" />
      {/* User body */}
      <polygon points="16 16 16 20 15 20 15 21 2 21 2 20 1 20 1 16 2 16 2 15 3 15 3 14 4 14 4 13 6 13 6 14 11 14 11 13 13 13 13 14 14 14 14 15 15 15 15 16 16 16" />
    </PixelSVG>
  );
}
