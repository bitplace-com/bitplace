import { useState } from 'react';
import { Wallet, User, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassPanel } from '@/components/ui/glass-panel';
import { GlassIconButton } from '@/components/ui/glass-icon-button';
import { UserMenuPanel } from '@/components/modals/UserMenuPanel';
import { useWallet } from '@/contexts/WalletContext';

function shortenAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export function WalletButton() {
  const { isConnected, isConnecting, walletAddress, connect, energy } = useWallet();

  if (isConnecting) {
    return (
      <GlassPanel padding="sm" className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Connecting...</span>
      </GlassPanel>
    );
  }

  if (isConnected && walletAddress) {
    return (
      <UserMenuPanel>
        <GlassPanel
          padding="sm"
          className="flex items-center gap-2.5 cursor-pointer hover:bg-[hsl(0_0%_97%/0.85)] transition-colors"
        >
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-mono text-xs text-foreground">
            {shortenAddress(walletAddress)}
          </span>
          <span className="text-xs text-muted-foreground">•</span>
          <span className="text-xs font-medium text-foreground">
            {energy.nativeBalance.toFixed(2)} {energy.nativeSymbol}
          </span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </GlassPanel>
      </UserMenuPanel>
    );
  }

  return (
    <Button
      onClick={connect}
      size="sm"
      className="gap-2 rounded-xl shadow-md bg-primary text-primary-foreground hover:bg-primary/90"
    >
      <Wallet className="h-4 w-4" />
      Connect Wallet
    </Button>
  );
}
