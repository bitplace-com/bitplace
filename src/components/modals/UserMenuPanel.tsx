import { PixelIcon } from "@/components/icons";
import { PEIcon } from "@/components/ui/pe-icon";
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
import { LeaderboardModal } from "./LeaderboardModal";
import { ShopModal } from "./ShopModal";

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
  const { user, walletAddress, disconnect, energy, isTrialMode, connect } = useWallet();
  const [copied, setCopied] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
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
        className="w-80 p-0 bg-popover/95 backdrop-blur-xl border-border rounded-2xl shadow-xl z-50"
      >
        {/* User Header */}
        <div className="p-4">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            {user?.avatar_url ? (
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
                {isTrialMode && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
                    TRIAL
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {walletAddress && !isTrialMode && (
                  <button
                    onClick={handleCopyAddress}
                    className="flex items-center gap-1 text-xs text-muted-foreground font-mono hover:text-foreground transition-colors"
                  >
                    {shortenAddress(walletAddress)}
                    {copied ? (
                      <PixelIcon name="check" className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <PixelIcon name="copy" className="h-3 w-3" />
                    )}
                  </button>
                )}
                {isTrialMode && (
                  <span className="text-xs text-muted-foreground">Test session — nothing is saved</span>
                )}
              </div>
              {country && !isTrialMode && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {country.flag} {country.name}
                </p>
              )}
              {user?.alliance_tag && !isTrialMode && (
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

        {/* Wallet Section */}
        <div className="p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <PixelIcon name="wallet" className="h-3.5 w-3.5" />
            <span className="uppercase tracking-wider font-medium">Wallet</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-mono font-semibold text-foreground">
              {formatNumber(energy.nativeBalance, 4)} {energy.nativeSymbol}
            </span>
            <span className="text-sm text-muted-foreground">
              ${formatUsd(energy.walletUsd)}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Synced {formatRelativeTime(energy.lastSyncAt)}
          </p>
        </div>

        <Separator className="bg-border" />

        {/* Stats - 4 gameplay-critical items */}
        <div className="p-4 grid grid-cols-2 gap-3">
          <div className="p-2.5 rounded-xl bg-accent border border-border">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Pixels Owned
            </p>
            <p className="text-sm font-semibold text-foreground">
              {energy.pixelsOwned.toLocaleString()}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-accent border border-border">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Total Staked
            </p>
            <p className="text-sm font-semibold text-foreground">
              {energy.pixelStakeTotal.toLocaleString()}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-accent border border-border">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <PEIcon size="xs" /> Total
            </p>
            <p className="text-sm font-semibold text-foreground tabular-nums">
              {energy.peTotal.toLocaleString()}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-accent border border-border">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <PEIcon size="xs" /> Available
            </p>
            <p className="text-sm font-semibold text-foreground tabular-nums">
              {energy.peAvailable.toLocaleString()}
            </p>
          </div>
        </div>

        <Separator className="bg-border" />

        <div className="p-2">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 h-10 rounded-xl hover:bg-accent"
            onClick={() => setLeaderboardOpen(true)}
          >
            <PixelIcon name="trophy" className="h-4 w-4" />
            Leaderboard
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

        {/* Disconnect / Connect Real Wallet */}
        <div className="p-2">
          {isTrialMode ? (
            <>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-10 rounded-xl text-foreground hover:bg-accent"
                onClick={() => {
                  disconnect();
                  // Small delay then open connect flow
                  // User needs to click connect wallet after
                }}
              >
                <PixelIcon name="wallet" className="h-4 w-4" />
                Connect Real Wallet
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-10 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={disconnect}
              >
                <PixelIcon name="logout" className="h-4 w-4" />
                Exit Trial
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-10 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={disconnect}
            >
              <PixelIcon name="logout" className="h-4 w-4" />
              Disconnect
            </Button>
          )}
        </div>
      </PopoverContent>
      
      {/* Settings Modal */}
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
      
      {/* Leaderboard Modal */}
      <LeaderboardModal open={leaderboardOpen} onOpenChange={setLeaderboardOpen} />
      
      {/* Shop Modal */}
      <ShopModal open={shopOpen} onOpenChange={setShopOpen} />
    </Popover>
  );
}
