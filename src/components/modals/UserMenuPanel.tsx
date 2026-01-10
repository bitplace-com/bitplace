import { User, LogOut, BarChart3, Copy, Check, BookOpen, Users, Volume2, VolumeX, Wallet, Settings } from "lucide-react";
import { PEIcon } from "@/components/ui/pe-icon";
import { useNavigate } from "react-router-dom";
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
import { usePixelStats } from "@/hooks/usePixelStats";
import { useSound } from "@/hooks/useSound";
import { getCountryByCode } from "@/lib/countries";
import { generateAvatarGradient, getAvatarInitial } from "@/lib/avatar";
import { cn } from "@/lib/utils";
import { SettingsModal } from "./SettingsModal";

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
  const navigate = useNavigate();
  const { user, walletAddress, disconnect, energy } = useWallet();
  const pixelStats = usePixelStats(user?.id);
  const [copied, setCopied] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { enabled: soundEnabled, toggle: toggleSound } = useSound();

  const country = getCountryByCode(user?.country_code);
  const avatarGradient = generateAvatarGradient(walletAddress || "default");
  const avatarInitial = getAvatarInitial(user?.display_name, walletAddress);

  // Calculate PE Available = PE Total - PE Used (staked + defending + attacking)
  const peUsed = pixelStats.totalStaked + pixelStats.totalDefending + pixelStats.totalAttacking;
  const peAvailable = Math.max(0, energy.peTotal - peUsed);

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
              <div
                className="h-12 w-12 rounded-full flex items-center justify-center text-white font-bold text-lg border-2 border-border"
                style={{ background: avatarGradient }}
              >
                {avatarInitial}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate">
                {user?.display_name || "Anonymous"}
              </p>
              <div className="flex items-center gap-1.5">
                {walletAddress && (
                  <button
                    onClick={handleCopyAddress}
                    className="flex items-center gap-1 text-xs text-muted-foreground font-mono hover:text-foreground transition-colors"
                  >
                    {shortenAddress(walletAddress)}
                    {copied ? (
                      <Check className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                )}
              </div>
              {country && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {country.flag} {country.name}
                </p>
              )}
              {user?.alliance_tag && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Users className="h-3 w-3 text-foreground" />
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
            <Wallet className="h-3.5 w-3.5" />
            <span className="uppercase tracking-wider font-medium">Wallet</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-mono font-semibold text-foreground">
              {energy.nativeBalance.toFixed(4)} {energy.nativeSymbol}
            </span>
            <span className="text-sm text-muted-foreground">
              ${energy.walletUsd.toFixed(2)}
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
              {pixelStats.pixelsOwned.toLocaleString()}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-accent border border-border">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Total Staked
            </p>
            <p className="text-sm font-semibold text-foreground">
              {pixelStats.totalStaked.toLocaleString()}
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
              {peAvailable.toLocaleString()}
            </p>
          </div>
        </div>

        <Separator className="bg-border" />

        <div className="p-2">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 h-10 rounded-xl hover:bg-accent"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="h-4 w-4" />
            Settings
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 h-10 rounded-xl hover:bg-accent"
            onClick={() => navigate("/leaderboard")}
          >
            <BarChart3 className="h-4 w-4" />
            Leaderboard
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 h-10 rounded-xl hover:bg-accent"
            onClick={() => navigate("/rules")}
          >
            <BookOpen className="h-4 w-4" />
            Rules
          </Button>
        </div>

        <Separator className="bg-border" />

        {/* Settings */}
        <div className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              <span>Sound effects</span>
            </div>
            <Switch checked={soundEnabled} onCheckedChange={toggleSound} />
          </div>
        </div>

        <Separator className="bg-border" />

        {/* Disconnect */}
        <div className="p-2">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 h-10 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={disconnect}
          >
            <LogOut className="h-4 w-4" />
            Disconnect
          </Button>
        </div>
      </PopoverContent>
      
      {/* Settings Modal */}
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </Popover>
  );
}
