import { useState } from 'react';
import { PixelIcon } from '@/components/icons';
import { ProBadge } from '@/components/ui/pro-badge';
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
    isTrialMode,
    activateTrialMode,
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

  // Trial mode - show trial wallet button
  if (isTrialMode && walletAddress) {
    return (
      <UserMenuPanel>
        <GlassPanel
          padding="sm"
          className="flex items-center gap-2.5 cursor-pointer hover:bg-accent transition-colors"
          data-tour="wallet"
        >
          <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            TRIAL
          </span>
          <span className="text-xs font-medium text-foreground">
            Test Wallet
          </span>
          <span className="text-xs text-muted-foreground">•</span>
          <span className="text-xs font-medium text-foreground tabular-nums">
            {energy.peAvailable.toLocaleString()} PE
          </span>
          <PixelIcon name="chevronDown" size="xs" className="text-muted-foreground" />
        </GlassPanel>
      </UserMenuPanel>
    );
  }

  // Google authenticated state (Google-only shows STARTER, 'both' shows wallet address)
  if (isGoogleAuth && isConnected && walletAddress && !isTrialMode) {
    const avatarUrl = user?.google_avatar_url || user?.avatar_url;
    const isBoth = user?.auth_provider === 'both';
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
          {isBoth && walletAddress ? (
            <span className="font-mono text-xs text-foreground">
              {shortenAddress(walletAddress)}
            </span>
          ) : (
            <span className="text-xs font-medium text-foreground truncate max-w-[80px]">
              {user?.display_name || user?.email?.split('@')[0] || 'Starter'}
            </span>
          )}
          {isGoogleOnly && user?.auth_provider !== 'both' && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 shrink-0 flex items-center gap-0.5">
              <PixelIcon name="clock" className="h-2.5 w-2.5" />
              STARTER
            </span>
          )}
          {user?.auth_provider === 'both' && energy.nativeBalance >= 1 && (
            <ProBadge shine size="sm" />
          )}
          <span className="text-xs text-muted-foreground">•</span>
          <span className="text-xs font-medium text-foreground tabular-nums">
            {energy.peAvailable.toLocaleString()} PE
          </span>
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
        onActivateTrial={activateTrialMode}
        needsSignature={needsSignature}
        connectedWalletAddress={walletAddress}
        onSignIn={handleSignIn}
      />
    </div>
  );
}
