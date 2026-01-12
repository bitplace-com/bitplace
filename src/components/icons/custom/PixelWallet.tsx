import { PixelSVG, PixelSVGProps } from './base';

// Wallet icon SOLID (from HackerNoon hn-wallet-solid)
export function PixelWallet(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <path d="m22,8v-1H4v-2h18v-2h-1v-1H2v1h-1v18h1v1h20v-1h1v-13h-1Zm-1,7h-1v1h-2v-1h-1v-2h1v-1h2v1h1v2Z"/>
    </PixelSVG>
  );
}
