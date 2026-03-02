import { PixelIcon } from "@/components/icons";
import { GoogleLogo } from "@/components/icons/GoogleLogo";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { ProBadge } from "@/components/ui/pro-badge";
import { StarterBadge } from "@/components/ui/starter-badge";
import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useWallet } from "@/contexts/WalletContext";
import { useSound } from "@/hooks/useSound";
import { getCountryByCode } from "@/lib/countries";
import { AvatarFallback } from "@/components/ui/avatar-fallback-pattern";
import { cn, formatUsd, formatNumber } from "@/lib/utils";
import { SettingsModal } from "./SettingsModal";
import { ShopModal } from "./ShopModal";
import { PixelControlPanel } from "./PixelControlPanel";
import { useVpeRenew } from "@/hooks/useVpeRenew";

interface UserMenuPanelProps {
  children: React.ReactNode;
}

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatRelativeTime(date: Date | null): string {
  if (!date) return "never";
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function UserMenuPanel({ children }: UserMenuPanelProps) {
  const { user, walletAddress, disconnect, energy, isGoogleAuth, isGoogleOnly, linkWallet, googleSignIn } = useWallet();
  const [copied, setCopied] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [pixelControlOpen, setPixelControlOpen] = useState(false);
  const [pixelAlertDismissed, setPixelAlertDismissed] = useState(false);
  const vpeRenew = useVpeRenew(user?.id);
  const { enabled: soundEnabled, toggle: toggleSound } = useSound();

  const country = getCountryByCode(user?.country_code);

  const handleCopyAddress = async () => {
    if (walletAddress) {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 max-h-[85vh] overflow-y-auto p-0 bg-popover/95 backdrop-blur-xl border-border rounded-2xl shadow-xl z-50"
      >
        {/* User Header */}
        <div className="p-4">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            {(isGoogleAuth && user?.google_avatar_url) ? (
              <img
                src={user.google_avatar_url}
                alt="Avatar"
                className="h-12 w-12 rounded-full object-cover border-2 border-border"
              />
            ) : user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt="Avatar"
                className="h-12 w-12 rounded-full object-cover border-2 border-border"
              />
            ) : (
              <AvatarFallback
                seed={walletAddress || "default"}
                className="h-12 w-12 border-2 border-border"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-foreground truncate">
                  {user?.display_name || "Anonymous"}
                </p>
                {isGoogleOnly && (
                  user?.auth_provider !== 'both' ? (
                    <StarterBadge shine size="sm" />
                  ) : null
                )}
                {energy.nativeBalance >= 1 && (
                  <ProBadge shine size="sm" />
                )}
              </div>
              {/* Email for Google users */}
              {isGoogleAuth && user?.email && (
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              )}
              {country && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {country.flag} {country.name}
                </p>
              )}
              {user?.alliance_tag && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <PixelIcon name="usersCrown" className="h-3 w-3 text-foreground" />
                  <span className="text-xs font-medium font-mono text-foreground">
                    [{user.alliance_tag}]
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <Separator className="bg-border" />

        <TooltipProvider delayDuration={200}>
        {/* PIXELS section — Google-only and 'both' users */}
        {(isGoogleOnly || user?.auth_provider === 'both') && energy.virtualPeTotal > 0 && (
          <div className="p-4 space-y-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground cursor-help flex items-center gap-1.5">
                  <PixelIcon name="brush" className="h-3.5 w-3.5" />
                  Pixels
                </p>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-56 text-xs">
                Your free pixel budget. Pixels expire after 72h but you can renew them to reset the timer.
              </TooltipContent>
            </Tooltip>
            <div>
              <p className="text-lg font-bold text-foreground tabular-nums leading-tight">
                {energy.virtualPeAvailable.toLocaleString()}
                <span className="text-xs text-muted-foreground font-normal ml-1.5">• Available to use</span>
              </p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted-foreground">Used</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {energy.virtualPeUsed.toLocaleString()} / {energy.virtualPeTotal.toLocaleString()}
                </span>
              </div>
            </div>
            {!pixelAlertDismissed && (
              <div className="flex items-start gap-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3">
                <PixelIcon name="clock" className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">Pixels expire after 72h</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    Open the Pixel Control Center to renew all your painted pixels at once and reset the 72h timer before they disappear.
                  </p>
                </div>
                <button onClick={() => setPixelAlertDismissed(true)} className="shrink-0 p-0.5 rounded hover:bg-amber-500/20 transition-colors">
                  <PixelIcon name="close" className="h-3 w-3 text-amber-500" />
                </button>
              </div>
            )}
          </div>
        )}

        <Separator className="bg-border" />

        {/* WALLET section — always visible */}
        <div className="p-4 space-y-3">
          <p className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground flex items-center gap-1.5">
            <PixelIcon name="wallet" className="h-3.5 w-3.5" />
            Wallet
          </p>
          {walletAddress ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-foreground tabular-nums leading-tight">
                  {formatNumber(energy.nativeBalance, 2)} {energy.nativeSymbol}
                </span>
                <span className="text-sm font-semibold text-emerald-500 tabular-nums">
                  ${formatUsd(energy.walletUsd)}
                </span>
              </div>
              <button
                onClick={handleCopyAddress}
                className="flex items-center gap-1 text-xs text-muted-foreground font-mono hover:text-foreground transition-colors mt-1"
              >
                {shortenAddress(walletAddress)}
                {copied ? (
                  <PixelIcon name="check" className="h-3 w-3 text-emerald-500" />
                ) : (
                  <PixelIcon name="copy" className="h-3 w-3" />
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Connect a Solana wallet to unlock Paint Energy, defend your pixels, and earn rewards.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 h-9 rounded-xl"
                onClick={linkWallet}
              >
                <PixelIcon name="wallet" className="h-3.5 w-3.5" />
                Connect Wallet
              </Button>
            </div>
          )}
        </div>

        </TooltipProvider>

        <Separator className="bg-border" />

        <div className="p-2">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 h-10 rounded-xl hover:bg-accent relative"
            onClick={() => setPixelControlOpen(true)}
          >
            <PixelIcon name="grid3x3" className="h-4 w-4" />
            Pixel Control Center
            {vpeRenew.renewableCount > 0 && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 h-5 min-w-5 px-1 flex items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                {vpeRenew.renewableCount}
              </span>
            )}
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 h-10 rounded-xl hover:bg-accent"
            onClick={() => setSettingsOpen(true)}
          >
            <PixelIcon name="settings" className="h-4 w-4" />
            Settings
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 h-10 rounded-xl hover:bg-accent"
            onClick={() => setShopOpen(true)}
          >
            <PixelIcon name="cart" className="h-4 w-4" />
            Get $BIT
          </Button>
        </div>

        <Separator className="bg-border" />

        {/* Settings */}
        <div className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {soundEnabled ? (
                <PixelIcon name="volumeOn" className="h-4 w-4" />
              ) : (
                <PixelIcon name="volumeOff" className="h-4 w-4" />
              )}
              <span>Sound effects</span>
            </div>
            <Switch checked={soundEnabled} onCheckedChange={toggleSound} />
          </div>
        </div>

        <Separator className="bg-border" />

        {/* Disconnect / Sign Out */}
        <div className="p-2">
          {isGoogleOnly && !walletAddress && (
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-10 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={disconnect}
            >
              <PixelIcon name="logout" className="h-4 w-4" />
              Sign Out
            </Button>
          )}
          {!isGoogleOnly && (
            <>
              {user?.auth_provider !== 'both' && (
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 h-10 rounded-xl text-foreground hover:bg-accent"
                  onClick={googleSignIn}
                >
                  <GoogleLogo className="h-4 w-4" />
                  Connect Google
                </Button>
              )}
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-10 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={disconnect}
              >
                <PixelIcon name="logout" className="h-4 w-4" />
                Disconnect
              </Button>
            </>
          )}
          {isGoogleOnly && walletAddress && (
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-10 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={disconnect}
            >
              <PixelIcon name="logout" className="h-4 w-4" />
              Sign Out
            </Button>
          )}
        </div>
      </PopoverContent>
      
      {/* Settings Modal */}
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
      
      {/* Shop Modal */}
      <ShopModal open={shopOpen} onOpenChange={setShopOpen} />
      
      {/* Pixel Control Panel */}
      <PixelControlPanel open={pixelControlOpen} onOpenChange={setPixelControlOpen} />
    </Popover>
  );
}
