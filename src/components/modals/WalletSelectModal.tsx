import { useState, useEffect } from 'react';
import { PixelIcon } from '@/components/icons';
import { useWallet } from '@/contexts/WalletContext';
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
  onActivateTrial?: () => void;
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
  onActivateTrial,
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
            Connect your Phantom wallet to play Bitplace.
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
                {/* Ghost body */}
                <path
                  d="M110.584 64.9142H99.142C99.142 41.7651 80.173 23 56.7724 23C33.6612 23 14.8716 41.3057 14.4118 64.0599C13.9361 87.576 35.5765 107 59.4867 107H63.4989C85.0042 107 110.584 88.7583 110.584 64.9142Z"
                  fill="white"
                />
                {/* Left eye */}
                <path
                  d="M40.2729 67.9011C40.2729 71.5233 37.3407 74.4614 33.7261 74.4614C30.1114 74.4614 27.1792 71.5233 27.1792 67.9011V59.6289C27.1792 56.0067 30.1114 53.0686 33.7261 53.0686C37.3407 53.0686 40.2729 56.0067 40.2729 59.6289V67.9011Z"
                  fill="#AB9FF2"
                />
                {/* Right eye */}
                <path
                  d="M58.9369 67.9011C58.9369 71.5233 56.0047 74.4614 52.3901 74.4614C48.7754 74.4614 45.8432 71.5233 45.8432 67.9011V59.6289C45.8432 56.0067 48.7754 53.0686 52.3901 53.0686C56.0047 53.0686 58.9369 56.0067 58.9369 59.6289V67.9011Z"
                  fill="#AB9FF2"
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


          {/* Install guidance for desktop */}
          {phantomInstalled === false && !isMobile && (
            <p className="text-xs text-muted-foreground text-center px-4">
              Click above to install the Phantom browser extension, then refresh this page.
            </p>
          )}

          {/* Trial mode option */}
          {onActivateTrial && (
            <div className="px-4 py-3 rounded-lg border border-dashed border-border/50 text-center">
              <p className="text-xs text-muted-foreground mb-2">
                No wallet? <span className="font-medium text-foreground">Try without one.</span>
              </p>
              <p className="text-[11px] text-muted-foreground mb-3">
                Paint with 100,000 free test PE. Nothing is saved — it's just a preview of the experience.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onActivateTrial();
                  onOpenChange(false);
                }}
                className="gap-2"
              >
                <PixelIcon name="sparkles" size="sm" />
                Try Test Wallet
              </Button>
            </div>
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
