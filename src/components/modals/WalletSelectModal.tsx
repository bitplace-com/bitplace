import { useState, useEffect } from 'react';
import { PixelIcon } from '@/components/icons';
import { GoogleLogo } from '@/components/icons/GoogleLogo';
import { useWallet } from '@/contexts/WalletContext';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import phantomLogo from '@/assets/phantom-logo.png';

interface WalletSelectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectPhantom: () => void;
  isConnecting: boolean;
  needsSignature?: boolean;
  connectedWalletAddress?: string | null;
  onSignIn?: () => void;
}

// Detect if Phantom is installed (extension or in-app browser)
const getPhantomProvider = () => {
  if (typeof window === 'undefined') return null;
  const phantom = (window as any).phantom?.solana;
  if (phantom?.isPhantom) return phantom;
  const solana = (window as any).solana;
  if (solana?.isPhantom) return solana;
  return null;
};

const isMobileDevice = () => {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
};


export function WalletSelectModal({
  open,
  onOpenChange,
  onSelectPhantom,
  isConnecting,
  needsSignature,
  connectedWalletAddress,
  onSignIn,
}: WalletSelectModalProps) {
  const { googleSignIn } = useWallet();
  const [phantomInstalled, setPhantomInstalled] = useState<boolean | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => {
      setPhantomInstalled(!!getPhantomProvider());
      setIsMobile(isMobileDevice());
    };
    check();
    const timeout = setTimeout(check, 500);
    return () => clearTimeout(timeout);
  }, []);

  const handlePhantomClick = () => {
    if (phantomInstalled) {
      onSelectPhantom();
      return;
    }
    if (isMobile) {
      const appUrl = window.location.origin;
      window.location.href = `https://phantom.app/ul/browse/${encodeURIComponent(appUrl)}`;
      return;
    }
    window.open('https://phantom.app/', '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-popover/95 backdrop-blur-xl border-border" data-tour="wallet-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PixelIcon name="user" size="md" />
            Sign In to Bitplace
          </DialogTitle>
          <DialogDescription>
            Choose your account type to start playing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {/* Connected wallet - Continue with signature */}
          {needsSignature && connectedWalletAddress && onSignIn && (
            <>
              <TierCard
                onClick={() => { onSignIn(); onOpenChange(false); }}
                disabled={isConnecting}
                icon={<img src={phantomLogo} alt="Phantom" className="h-10 w-10 rounded-xl object-contain" />}
                title="Continue with Phantom"
                subtitle="Sign to complete authentication"
                badge={null}
              />
              <div className="flex items-center gap-3 px-2">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground">or use another method</span>
                <Separator className="flex-1" />
              </div>
            </>
          )}

          {/* ── Tier 1: Google (Starter) ── */}
          <TierCard
            onClick={async () => { await googleSignIn(); onOpenChange(false); }}
            disabled={isConnecting}
            icon={
              <div className="h-10 w-10 rounded-xl bg-card flex items-center justify-center border border-border">
                <GoogleLogo />
              </div>
            }
            title="Sign in with Google"
            subtitle="300,000 free Pixels — draw anywhere, expire after 72h unless renewed"
            badge={<TierBadge label="STARTER" />}
          />

          {/* ── Tier 2: Phantom (Pro) ── */}
          {!needsSignature && (
            <>
              <div className="flex items-center gap-3 px-2">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground">or</span>
                <Separator className="flex-1" />
              </div>

              <TierCard
                onClick={handlePhantomClick}
                disabled={isConnecting}
                icon={<img src={phantomLogo} alt="Phantom" className="h-10 w-10 rounded-xl object-contain" />}
                title="Phantom Wallet"
                subtitle={
                  phantomInstalled === null
                    ? 'Detecting...'
                    : phantomInstalled
                      ? 'Permanent PE from $BIT holdings — full pixel ownership'
                      : isMobile
                        ? 'Open in Phantom app'
                        : 'Install to get permanent PE'
                }
                badge={<TierBadge label="PRO" variant="pro" />}
                trailing={isConnecting ? <PixelIcon name="loader" size="md" className="animate-spin" /> : undefined}
              />

              {phantomInstalled === false && !isMobile && (
                <p className="text-xs text-muted-foreground text-center px-4">
                  Click above to install the Phantom browser extension, then refresh this page.
                </p>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isConnecting}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════ Sub-components ═══════════════════ */

function TierCard({
  onClick,
  disabled,
  icon,
  title,
  subtitle,
  badge,
  trailing,
}: {
  onClick: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  badge: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
    >
      {icon}
      <div className="flex-1 text-left min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{title}</span>
          {badge}
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
      {trailing || (
        <PixelIcon name="chevronRight" size="md" className="text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
      )}
    </button>
  );
}

function TierBadge({ label, variant = 'default' }: { label: string; variant?: 'default' | 'pro' | 'muted' }) {
  const styles = {
    default: 'bg-foreground/10 text-foreground border-border',
    pro: 'bg-primary/10 text-primary border-primary/20',
    muted: 'bg-muted text-muted-foreground border-border/50',
  };
  return (
    <span className={`px-1.5 py-0.5 text-[10px] font-bold uppercase rounded border shrink-0 ${styles[variant]}`}>
      {label}
    </span>
  );
}