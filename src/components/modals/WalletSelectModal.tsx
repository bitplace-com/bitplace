import { useState, useEffect } from 'react';
import { PixelIcon } from '@/components/icons';
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

// Real multicolor Google "G" logo
function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

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