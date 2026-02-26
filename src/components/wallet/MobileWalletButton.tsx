import { useState, useRef, useEffect, useCallback } from 'react';
import { GlassPanel } from '@/components/ui/glass-panel';
import { GlassIconButton } from '@/components/ui/glass-icon-button';
import { PixelIcon } from '@/components/icons';
import { WalletButton } from './WalletButton';
import { WalletSelectModal } from '@/components/modals/WalletSelectModal';
import { useWallet } from '@/contexts/WalletContext';
import { cn } from '@/lib/utils';

export function MobileWalletButton() {
  const { isConnected, isConnecting, needsSignature, walletAddress, connect, signIn, isGoogleAuth } = useWallet();
  const [collapsed, setCollapsed] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoCollapseTimer = useRef<ReturnType<typeof setTimeout>>();

  // Auto-collapse after 15s of inactivity when expanded
  useEffect(() => {
    if (!collapsed) {
      autoCollapseTimer.current = setTimeout(() => setCollapsed(true), 15000);
      return () => clearTimeout(autoCollapseTimer.current);
    }
  }, [collapsed]);

  // Click outside to collapse (but not when clicking inside Radix portals)
  useEffect(() => {
    if (collapsed) return;
    const handler = (e: PointerEvent) => {
      const target = e.target as Element;
      // Don't collapse if clicking inside a Radix portal (popover, dialog, etc.)
      if (
        target.closest?.('[data-radix-popper-content-wrapper]') ||
        target.closest?.('[data-radix-dialog-overlay]') ||
        target.closest?.('[role="dialog"]')
      ) {
        // Reset auto-collapse timer on interaction
        clearTimeout(autoCollapseTimer.current);
        autoCollapseTimer.current = setTimeout(() => setCollapsed(true), 15000);
        return;
      }
      if (containerRef.current && !containerRef.current.contains(target as Node)) {
        setCollapsed(true);
      }
    };
    document.addEventListener('pointerdown', handler, true);
    return () => document.removeEventListener('pointerdown', handler, true);
  }, [collapsed]);

  const handleExpand = useCallback(() => {
    setCollapsed(false);
    clearTimeout(autoCollapseTimer.current);
  }, []);

  const handleConnectClick = async () => {
    setModalOpen(true);
  };

  const handleSelectPhantom = async () => {
    await connect();
    setModalOpen(false);
  };

  // Loading state
  if (isConnecting) {
    return (
      <GlassPanel padding="sm" className="flex items-center justify-center h-10 w-10 rounded-xl">
        <PixelIcon name="loader" size="sm" className="animate-spin text-muted-foreground" />
      </GlassPanel>
    );
  }

  // Not connected or AUTH_REQUIRED: show Sign In button that opens modal
  if (!isConnected || needsSignature) {
    return (
      <div className="flex flex-col items-center gap-1" data-tour="wallet">
        <GlassIconButton size="lg" onClick={handleConnectClick} aria-label="Sign In">
          <PixelIcon name="user" size="md" />
        </GlassIconButton>
        <WalletSelectModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          onSelectPhantom={handleSelectPhantom}
          isConnecting={isConnecting}
          needsSignature={needsSignature}
          connectedWalletAddress={walletAddress}
          onSignIn={async () => { await signIn(); setModalOpen(false); }}
        />
      </div>
    );
  }

  // Connected: collapsible
  return (
    <div ref={containerRef}>
      {collapsed ? (
        // Collapsed: green pulsing dot
        <button
          onClick={handleExpand}
          className={cn(
            "h-10 w-10 rounded-xl flex items-center justify-center",
            "backdrop-blur-[12px] backdrop-saturate-[140%]",
            "bg-card/70 dark:bg-card/80",
            "transition-all duration-200 active:scale-95"
          )}
          aria-label="Show wallet info"
        >
          <div className={cn(
            "h-2.5 w-2.5 rounded-full animate-pulse",
            isGoogleAuth ? "bg-blue-500" : "bg-emerald-500"
          )} />
        </button>
      ) : (
        // Expanded: full WalletButton with slide-in animation
        <div className="animate-in slide-in-from-right-2 fade-in duration-200">
          <WalletButton />
        </div>
      )}
    </div>
  );
}
