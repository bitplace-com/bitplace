import { useState } from 'react';
import { PixelIcon } from '@/components/icons';
import { PixelBalanceIcon } from '@/components/ui/vpe-icon';
import { ProBadge } from '@/components/ui/pro-badge';
import { StarterBadge } from '@/components/ui/starter-badge';
import { Button } from '@/components/ui/button';
import { GlassPanel } from '@/components/ui/glass-panel';
import { UserMenuPanel } from '@/components/modals/UserMenuPanel';
import { WalletSelectModal } from '@/components/modals/WalletSelectModal';
import { useWallet } from '@/contexts/WalletContext';
import { formatNumber } from '@/lib/utils';

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
    needsSignature,
    isGoogleAuth,
    isGoogleOnly,
    user,
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
      <GlassPanel padding="sm" className="flex items-center gap-2" data-tour="wallet">
        <PixelIcon name="loader" size="sm" className="animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          {walletState === 'AUTHENTICATING' ? 'Signing in...' : 'Connecting...'}
        </span>
      </GlassPanel>
    );
  }

  // Google authenticated state (Google-only shows STARTER, 'both' shows wallet + PRO)
  if (isGoogleAuth && isConnected && walletAddress) {
    const avatarUrl = user?.google_avatar_url || user?.avatar_url;
    const isBoth = user?.auth_provider === 'both';
    const isPro = isBoth && energy.nativeBalance >= 1;
    // For display: show real PE + pixels separately
    const realPeAvailable = isBoth ? energy.peAvailable : 0;
    const virtualPeAvailable = energy.virtualPeAvailable;
    return (
      <UserMenuPanel>
        <GlassPanel
          padding="sm"
          className="flex items-center gap-2.5 cursor-pointer hover:bg-accent transition-colors"
          data-tour="wallet"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-6 w-6 rounded-full object-cover border border-border" />
          ) : (
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          )}
          <span className="text-xs font-medium text-foreground truncate max-w-[100px]">
            {user?.display_name || user?.email?.split('@')[0] || (walletAddress && !walletAddress.startsWith('google:') ? shortenAddress(walletAddress) : 'Starter')}
          </span>
          {isPro ? (
            <ProBadge shine size="sm" />
          ) : isGoogleOnly ? (
            <span className="text-[10px] font-bold tracking-wider bg-slate-400/10 px-1.5 py-0.5 rounded starter-badge-shine">STARTER</span>
          ) : null}
          <span className="text-xs text-muted-foreground">•</span>
          {/* Dual PE + Pixels display */}
          {isBoth ? (
            <span className="text-xs font-medium text-foreground tabular-nums flex items-center gap-1.5">
              {virtualPeAvailable > 0 && (
                <>
                  <span className="flex items-center gap-0.5">{virtualPeAvailable.toLocaleString()} Pixels</span>
                  <span className="text-muted-foreground">+</span>
                </>
              )}
              <span className="flex items-center gap-0.5">{realPeAvailable.toLocaleString()} PE</span>
            </span>
          ) : (
            <span className="text-xs font-medium text-foreground tabular-nums">
              {virtualPeAvailable.toLocaleString()} Pixels
            </span>
          )}
          <PixelIcon name="chevronDown" size="xs" className="text-muted-foreground" />
        </GlassPanel>
      </UserMenuPanel>
    );
  }

  // Fully authenticated state (wallet)
  if (isConnected && walletAddress) {
    return (
      <UserMenuPanel>
        <GlassPanel
          padding="sm"
          className="flex items-center gap-2.5 cursor-pointer hover:bg-accent transition-colors"
          data-tour="wallet"
        >
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-mono text-xs text-foreground">
            {shortenAddress(walletAddress)}
          </span>
          {energy.nativeBalance >= 1 && (
            <ProBadge shine size="sm" />
          )}
          <span className="text-xs text-muted-foreground">•</span>
          <span className="text-xs font-medium text-foreground">
            {formatNumber(energy.nativeBalance, 2)} {energy.nativeSymbol}
          </span>
          <PixelIcon name="chevronDown" size="xs" className="text-muted-foreground" />
        </GlassPanel>
      </UserMenuPanel>
    );
  }

  // Disconnected or AUTH_REQUIRED - always show Sign In button that opens modal
  return (
    <div className="flex flex-col items-end gap-1" data-tour="wallet">
      <Button
        onClick={handleConnectClick}
        size="sm"
        className="gap-2 rounded-xl shadow-lg backdrop-blur-md bg-white/90 text-black border border-white/20 hover:bg-white dark:bg-black/80 dark:text-white dark:border-white/10 dark:hover:bg-black/90"
      >
        <PixelIcon name="user" size="sm" />
        Sign In
      </Button>

      <WalletSelectModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSelectPhantom={handleSelectPhantom}
        isConnecting={isConnecting}
        needsSignature={needsSignature}
        connectedWalletAddress={walletAddress}
        onSignIn={handleSignIn}
      />
    </div>
  );
}
