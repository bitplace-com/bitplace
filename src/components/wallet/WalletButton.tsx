import { useState } from 'react';
import { Wallet, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassPanel } from '@/components/ui/glass-panel';
import { UserMenuPanel } from '@/components/modals/UserMenuPanel';
import { WalletSelectModal } from '@/components/modals/WalletSelectModal';
import { useWallet } from '@/contexts/WalletContext';

function shortenAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export function WalletButton() {
  const { 
    walletState, 
    walletAddress, 
    energy, 
    connect, 
    signIn,
    isConnected,
    isConnecting,
    needsSignature 
  } = useWallet();
  const [modalOpen, setModalOpen] = useState(false);

  const handleConnectClick = () => {
    setModalOpen(true);
  };

  const handleSelectPhantom = async () => {
    await connect();
    setModalOpen(false);
  };

  const handleSignIn = async () => {
    await signIn();
  };

  // Connecting or Authenticating state
  if (isConnecting) {
    return (
      <GlassPanel padding="sm" className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          {walletState === 'AUTHENTICATING' ? 'Signing in...' : 'Connecting...'}
        </span>
      </GlassPanel>
    );
  }

  // AUTH_REQUIRED state - wallet connected but needs signature
  if (needsSignature && walletAddress) {
    return (
      <GlassPanel
        padding="sm"
        className="flex items-center gap-2.5 cursor-pointer hover:bg-muted/80 transition-colors"
        onClick={handleSignIn}
      >
        <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
        <span className="font-mono text-xs text-foreground">
          {shortenAddress(walletAddress)}
        </span>
        <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
          Sign in →
        </span>
      </GlassPanel>
    );
  }

  // Fully authenticated state
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

  // Disconnected state - show connect button
  return (
    <>
      <Button
        onClick={handleConnectClick}
        size="sm"
        className="gap-2 rounded-xl shadow-md bg-primary text-primary-foreground hover:bg-primary/90"
      >
        <Wallet className="h-4 w-4" />
        Connect Wallet
      </Button>

      <WalletSelectModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSelectPhantom={handleSelectPhantom}
        isConnecting={isConnecting}
      />
    </>
  );
}
