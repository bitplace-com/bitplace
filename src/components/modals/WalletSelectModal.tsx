import { useState } from 'react';
import { Wallet, ExternalLink, Smartphone, X } from 'lucide-react';
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

// Detect if Phantom is installed
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

export function WalletSelectModal({
  open,
  onOpenChange,
  onSelectPhantom,
  isConnecting,
}: WalletSelectModalProps) {
  const [phantomInstalled, setPhantomInstalled] = useState<boolean | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Check on mount and after a short delay (extension might load late)
  useState(() => {
    const check = () => {
      setPhantomInstalled(!!getPhantomProvider());
      setIsMobile(isMobileDevice());
    };
    
    check();
    const timeout = setTimeout(check, 500);
    return () => clearTimeout(timeout);
  });

  const handlePhantomClick = () => {
    if (isMobile && !phantomInstalled) {
      // Open Phantom app deep link on mobile
      const currentUrl = encodeURIComponent(window.location.href);
      window.location.href = `https://phantom.app/ul/browse/${currentUrl}`;
      return;
    }
    
    if (!phantomInstalled) {
      // Open install page
      window.open('https://phantom.app/', '_blank');
      return;
    }
    
    // Trigger actual connection
    onSelectPhantom();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-popover/95 backdrop-blur-xl border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
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
            <div className="h-10 w-10 rounded-lg bg-[#AB9FF2] flex items-center justify-center flex-shrink-0">
              <svg
                width="24"
                height="24"
                viewBox="0 0 128 128"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M64 128C99.3462 128 128 99.3462 128 64C128 28.6538 99.3462 0 64 0C28.6538 0 0 28.6538 0 64C0 99.3462 28.6538 128 64 128Z"
                  fill="#AB9FF2"
                />
                <path
                  d="M110.584 64.9142H99.142C99.142 41.7651 80.173 23 56.7724 23C33.6612 23 14.8716 41.3057 14.4118 64.0599C13.9361 87.576 35.5765 107 59.4867 107H63.4989C85.0042 107 110.584 88.7583 110.584 64.9142ZM40.2729 67.9011C40.2729 71.5233 37.3407 74.4614 33.7261 74.4614C30.1114 74.4614 27.1792 71.5233 27.1792 67.9011V59.6289C27.1792 56.0067 30.1114 53.0686 33.7261 53.0686C37.3407 53.0686 40.2729 56.0067 40.2729 59.6289V67.9011ZM58.9SEE 67.9011C58.9369 71.5233 56.0047 74.4614 52.3901 74.4614C48.7754 74.4614 45.8432 71.5233 45.8432 67.9011V59.6289C45.8432 56.0067 48.7754 53.0686 52.3901 53.0686C56.0047 53.0686 58.9369 56.0067 58.9369 59.6289V67.9011Z"
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
                  'Solana wallet'
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
                <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : phantomInstalled ? (
                <ExternalLink className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              ) : isMobile ? (
                <Smartphone className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              ) : (
                <ExternalLink className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              )}
            </div>
          </button>

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
