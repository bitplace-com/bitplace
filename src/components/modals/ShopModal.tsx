import { useState } from "react";
import { Coins, Copy, Check, ExternalLink, RefreshCw, Smartphone } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { GameModal } from "./GameModal";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/contexts/WalletContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { ENERGY_ASSET, PE_PER_USD } from "@/config/energy";
import { toast } from "sonner";

interface ShopModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// TODO: Swap SOL -> BTP when ENERGY_ASSET changes to 'BTP'
// The ENERGY_ASSET config in src/config/energy.ts controls which asset is used for PE calculation
// When BTP launches, change ENERGY_ASSET to 'BTP' and update the Phantom swap link accordingly

export function ShopModal({ open, onOpenChange }: ShopModalProps) {
  const { walletAddress, energy, refreshEnergy, isConnected } = useWallet();
  const isMobile = useIsMobile();
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // TODO: Update this URL when switching to BTP
  const phantomSwapUrl = "https://phantom.app/ul/v1/swap";

  const truncatedAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : "";

  const handleCopyAddress = async () => {
    if (!walletAddress) return;
    
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      toast.success("Wallet address copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy address");
    }
  };

  const handleRefreshBalance = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await refreshEnergy();
      toast.success("Balance refreshed!");
    } catch {
      toast.error("Failed to refresh balance");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleOpenPhantomSwap = () => {
    if (!isMobile) {
      toast.info("Phantom swap is only available on mobile");
      return;
    }
    window.open(phantomSwapUrl, "_blank");
  };

  // Format PE with commas
  const formattedPE = energy?.peTotal 
    ? Math.floor(energy.peTotal).toLocaleString() 
    : "0";

  // Current asset symbol based on config
  // TODO: This will automatically update when ENERGY_ASSET changes
  const assetSymbol = ENERGY_ASSET === 'SOL' ? 'SOL' : 'BTP';

  return (
    <GameModal
      open={open}
      onOpenChange={onOpenChange}
      title="Get more PE"
      description={`Increase your Pixel Energy by adding ${assetSymbol} to your wallet`}
      icon={<Coins className="h-5 w-5" />}
    >
      <div className="space-y-4">
        {!isConnected ? (
          // Not connected state
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Coins className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground mb-1">Connect Your Wallet</p>
            <p className="text-sm text-muted-foreground">
              Connect your Phantom wallet to view your PE balance and add funds.
            </p>
          </div>
        ) : (
          <>
            {/* Current PE Display */}
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-center">
              <p className="text-xs text-muted-foreground mb-1">Your Current PE</p>
              <p className="text-2xl font-bold text-primary">{formattedPE} PE</p>
            </div>

            {/* Wallet Address Section */}
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                Send {assetSymbol} to your wallet address:
              </p>
              
              {/* Address with Copy */}
              <div className="flex items-center justify-center gap-2">
                <code className="px-3 py-2 rounded-lg bg-muted/50 font-mono text-sm">
                  {truncatedAddress}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleCopyAddress}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* QR Code */}
              {walletAddress && (
                <div className="flex justify-center py-2">
                  <div className="p-3 bg-white rounded-xl">
                    <QRCodeSVG
                      value={walletAddress}
                      size={120}
                      level="M"
                      includeMargin={false}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* CTA Buttons */}
            <div className="space-y-2 pt-2">
              {/* Phantom Swap Button */}
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleOpenPhantomSwap}
                disabled={!isMobile}
              >
                <ExternalLink className="h-4 w-4" />
                <span>Open Phantom Swap</span>
                {!isMobile && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground ml-1">
                    <Smartphone className="h-3 w-3" />
                    Mobile only
                  </span>
                )}
              </Button>

              {/* Refresh Balance Button */}
              <Button
                variant="default"
                className="w-full gap-2"
                onClick={handleRefreshBalance}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? "Refreshing..." : "I've added SOL — Refresh Balance"}</span>
              </Button>
            </div>

            {/* Info Box */}
            <div className="p-3 rounded-xl bg-muted/30 border border-border/50 space-y-2">
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">How PE works:</strong> Your PE is calculated from your wallet's USD value.
              </p>
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Rate:</strong> $1 USD = {PE_PER_USD.toLocaleString()} PE
              </p>
              {/* TODO: Update this text when ENERGY_ASSET changes */}
              <p className="text-xs text-primary/80">
                Currently using {assetSymbol} balance. This will switch to BTP when the token launches.
              </p>
            </div>
          </>
        )}
      </div>
    </GameModal>
  );
}
