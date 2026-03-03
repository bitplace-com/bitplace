import { useState } from "react";
import { PixelIcon } from "@/components/icons";
import { QRCodeSVG } from "qrcode.react";
import { GamePanel } from "./GamePanel";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/contexts/WalletContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { PE_PER_USD, BIT_TOKEN_MINT } from "@/config/energy";
import { toast } from "sonner";

interface ShopModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PUMP_FUN_URL = `https://pump.fun/coin/${BIT_TOKEN_MINT}`;
const TRUNCATED_CA = `${BIT_TOKEN_MINT.slice(0, 6)}...${BIT_TOKEN_MINT.slice(-4)}`;

function TokenInfoBox() {
  const [caCopied, setCaCopied] = useState(false);

  const handleCopyCA = async () => {
    try {
      await navigator.clipboard.writeText(BIT_TOKEN_MINT);
      setCaCopied(true);
      toast.success("Contract address copied!");
      setTimeout(() => setCaCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <div className="p-3 rounded-xl bg-muted border border-border space-y-1.5 text-xs text-muted-foreground">
      <p className="text-xs font-semibold text-foreground mb-2">Token Info</p>
      <div className="flex justify-between">
        <span>Network</span>
        <span className="font-medium text-foreground">Solana</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="shrink-0">CA</span>
        <div className="flex items-center gap-1">
          <code className="text-[11px] font-mono text-foreground">{TRUNCATED_CA}</code>
          <button onClick={handleCopyCA} className="text-muted-foreground hover:text-foreground transition-colors">
            {caCopied
              ? <PixelIcon name="check" className="h-3 w-3 text-emerald-500" />
              : <PixelIcon name="copy" className="h-3 w-3" />}
          </button>
        </div>
      </div>
      <div className="flex justify-between">
        <span>Total Supply</span>
        <span className="font-medium text-foreground">1,000,000,000 $BIT</span>
      </div>
      <a
        href={PUMP_FUN_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full mt-2 px-3 py-2 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-accent transition-colors"
      >
        <PixelIcon name="externalLink" className="h-3.5 w-3.5" />
        Trade on Pump.fun
      </a>
    </div>
  );
}

export function ShopModal({ open, onOpenChange }: ShopModalProps) {
  const { walletAddress, energy, refreshEnergy, isConnected } = useWallet();
  const isMobile = useIsMobile();
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  const formattedPE = energy?.peTotal
    ? Math.floor(energy.peTotal).toLocaleString()
    : "0";

  return (
    <GamePanel
      open={open}
      onOpenChange={onOpenChange}
      title="Get $BIT"
      description="The token that powers Bitplace"
      icon={<PixelIcon name="coins" className="h-5 w-5" />}
      size="sm"
    >
      <div className="space-y-4">
        {/* Educational: What is $BIT */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">What is $BIT?</h3>
          <p className="text-sm text-muted-foreground">
            $BIT is the token that powers Bitplace. It runs on the Solana network and determines how much
            Paint Energy (PE) you have to play with on the map.
          </p>
        </div>

        {/* How it connects */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">How it connects to the game</h3>
          <p className="text-sm text-muted-foreground">
            Your $BIT balance determines your Paint Energy. More $BIT means more PE, which means more
            actions on the map — painting, defending, attacking, and reinforcing pixels.
          </p>
          <p className="text-sm text-muted-foreground">
            Pixels painted with PE are permanent and protected. No one can paint over them unless they
            place more PE than you have on that pixel. The more energy you put on a pixel, the harder
            it is for others to take it.
          </p>
          <div className="flex gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
              <PixelIcon name="check" className="h-4 w-4" />
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="text-foreground font-medium">Your $BIT is never spent.</span>{" "}
              Your tokens stay safe in your wallet — only PE is used when you act on the map.
              Bitplace has no access to your tokens and cannot move them.
            </p>
          </div>
        </div>

        {/* Rate */}
        <div className="p-3 rounded-xl bg-muted border border-border text-center">
          <p className="text-xs text-muted-foreground mb-1">Conversion Rate</p>
          <p className="text-sm font-semibold text-foreground">$1 of $BIT = {PE_PER_USD.toLocaleString()} PE</p>
        </div>

        {/* Wallet section */}
        {!isConnected ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <PixelIcon name="wallet" className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground mb-1">Connect Your Wallet</p>
            <p className="text-sm text-muted-foreground">
              Connect your Phantom wallet to view your PE balance and add funds.
            </p>
          </div>
        ) : (
          <>
            {/* Current PE */}
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-center">
              <p className="text-xs text-muted-foreground mb-1">Your Current PE</p>
              <p className="text-2xl font-bold text-foreground">{formattedPE} PE</p>
            </div>

            {/* Address + QR */}
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                Send $BIT to your wallet address:
              </p>
              <div className="flex items-center justify-center gap-2">
                <code className="px-3 py-2 rounded-lg bg-muted font-mono text-sm">
                  {truncatedAddress}
                </code>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopyAddress}>
                  {copied ? (
                    <PixelIcon name="check" className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <PixelIcon name="copy" className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {walletAddress && (
                <div className="flex justify-center py-2">
                  <div className="p-3 bg-white rounded-xl">
                    <QRCodeSVG value={walletAddress} size={120} level="M" includeMargin={false} />
                  </div>
                </div>
              )}
            </div>

            {/* CTA Buttons */}
            <div className="space-y-2 pt-2">
              <Button variant="outline" className="w-full gap-2" onClick={handleOpenPhantomSwap} disabled={!isMobile}>
                <PixelIcon name="externalLink" className="h-4 w-4" />
                <span>Open Phantom Swap</span>
                {!isMobile && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground ml-1">
                    <PixelIcon name="smartphone" className="h-3 w-3" />
                    Mobile only
                  </span>
                )}
              </Button>
              <Button variant="default" className="w-full gap-2" onClick={handleRefreshBalance} disabled={isRefreshing}>
                <PixelIcon name="refresh" className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? "Refreshing..." : "Refresh Balance"}</span>
              </Button>
            </div>
          </>
        )}

        {/* Token Info — always visible */}
        <TokenInfoBox />
      </div>
    </GamePanel>
  );
}
