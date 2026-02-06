import { useState, useEffect } from 'react';
import { PixelIcon } from '@/components/icons';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface WalletSelectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectPhantom: () => void;
  isConnecting: boolean;
}

// Detect if Phantom is installed (extension or in-app browser)
const getPhantomProvider = () => {
  if (typeof window === 'undefined') return null;
  
  // Recommended Phantom detection
  const phantom = (window as any).phantom?.solana;
  if (phantom?.isPhantom) return phantom;
  
  // Fallback for older versions
  const solana = (window as any).solana;
  if (solana?.isPhantom) return solana;
  
  return null;
};

// Detect mobile device
const isMobileDevice = () => {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
};

// Detect if we're inside Phantom's in-app browser
const isPhantomInAppBrowser = () => {
  if (typeof navigator === 'undefined') return false;
  return navigator.userAgent.includes('Phantom');
};

export function WalletSelectModal({
  open,
  onOpenChange,
  onSelectPhantom,
  isConnecting,
}: WalletSelectModalProps) {
  const [phantomInstalled, setPhantomInstalled] = useState<boolean | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isInPhantomBrowser, setIsInPhantomBrowser] = useState(false);

  // Check on mount and after a short delay (extension might load late)
  useEffect(() => {
    const check = () => {
      setPhantomInstalled(!!getPhantomProvider());
      setIsMobile(isMobileDevice());
      setIsInPhantomBrowser(isPhantomInAppBrowser());
    };
    
    check();
    const timeout = setTimeout(check, 500);
    return () => clearTimeout(timeout);
  }, []);

  const handlePhantomClick = () => {
    // If Phantom provider is available (extension on desktop, or in-app browser on mobile)
    // Use native connection - this handles BOTH cases cleanly
    if (phantomInstalled) {
      onSelectPhantom();
      return;
    }
    
    // Mobile without Phantom app - use deeplink
    // The deeplink opens the Phantom app which will open our site in its in-app browser
    // where the provider WILL be available
    if (isMobile) {
      // Use the callback URL for clean return
      const appUrl = window.location.origin;
      const connectUrl = `${appUrl}/wallet-callback`;
      
      // Phantom universal link - opens the app and loads our site in its browser
      // After connection, the user will be in Phantom's in-app browser with provider available
      window.location.href = `https://phantom.app/ul/browse/${encodeURIComponent(appUrl)}`;
      return;
    }
    
    // Desktop without extension - open install page
    window.open('https://phantom.app/', '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-popover/95 backdrop-blur-xl border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PixelIcon name="wallet" size="md" />
            Connect Wallet
          </DialogTitle>
          <DialogDescription>
            Connect your Phantom wallet to use Bitplace. SOL temporarily powers PE (Pixel Energy).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {/* Phantom Option */}
          <button
            onClick={handlePhantomClick}
            disabled={isConnecting}
            className="w-full flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {/* Phantom Logo */}
            <div className="h-10 w-10 rounded-xl bg-[#AB9FF2] flex items-center justify-center flex-shrink-0">
              <svg
                width="24"
                height="24"
                viewBox="0 0 128 128"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M108.7 54.3H100.1C100.1 36.9 85.9 22.7 68.5 22.7C51.3 22.7 37.3 36.5 36.9 53.7C36.5 71.3 52.6 85.7 70.3 85.7H73.3C89.3 85.7 108.7 72.1 108.7 54.3ZM49.1 57.5C49.1 60.2 46.9 62.4 44.2 62.4C41.5 62.4 39.3 60.2 39.3 57.5V51.3C39.3 48.6 41.5 46.4 44.2 46.4C46.9 46.4 49.1 48.6 49.1 51.3V57.5ZM63.1 57.5C63.1 60.2 60.9 62.4 58.2 62.4C55.5 62.4 53.3 60.2 53.3 57.5V51.3C53.3 48.6 55.5 46.4 58.2 46.4C60.9 46.4 63.1 48.6 63.1 51.3V57.5Z"
                  fill="white"
                />
              </svg>
            </div>

            <div className="flex-1 text-left">
              <div className="font-medium text-foreground">Phantom</div>
              <div className="text-sm text-muted-foreground">
                {phantomInstalled === null ? (
                  'Detecting...'
                ) : phantomInstalled ? (
                  isInPhantomBrowser ? 'Tap to connect' : 'Solana wallet'
                ) : isMobile ? (
                  'Open in Phantom app'
                ) : (
                  'Not installed'
                )}
              </div>
            </div>

            {/* Action indicator */}
            <div className="flex-shrink-0">
              {isConnecting ? (
                <PixelIcon name="loader" size="md" className="animate-spin" />
              ) : phantomInstalled ? (
                <PixelIcon name="externalLink" size="md" className="text-muted-foreground group-hover:text-foreground transition-colors" />
              ) : isMobile ? (
                <PixelIcon name="smartphone" size="md" className="text-muted-foreground group-hover:text-foreground transition-colors" />
              ) : (
                <PixelIcon name="externalLink" size="md" className="text-muted-foreground group-hover:text-foreground transition-colors" />
              )}
            </div>
          </button>

          {/* Test phase notice */}
          <div className="px-4 py-3 rounded-lg bg-muted/50 border border-border/50">
            <p className="text-xs text-muted-foreground text-center">
              <span className="font-medium text-foreground">Test phase:</span> We're currently using{" "}
              <span className="font-medium text-foreground">$SOL</span> to power Pixel Energy.
              The official <span className="font-medium text-foreground">$BIT</span> token is coming soon.
            </p>
          </div>

          {/* Install guidance for desktop */}
          {phantomInstalled === false && !isMobile && (
            <p className="text-xs text-muted-foreground text-center px-4">
              Click above to install the Phantom browser extension, then refresh this page.
            </p>
          )}
        </div>

        <div className="flex justify-end">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isConnecting}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
