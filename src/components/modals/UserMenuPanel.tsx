import { User, LogOut, BarChart3, Star, Copy, Check, BookOpen, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useWallet } from "@/contexts/WalletContext";
import { usePeBalance } from "@/hooks/usePeBalance";
import { usePixelStats } from "@/hooks/usePixelStats";
import { getCountryByCode } from "@/lib/countries";
import { generateAvatarGradient, getAvatarInitial } from "@/lib/avatar";
import {
  calculateLevel,
  levelProgress,
  xpForLevel,
  xpForNextLevel,
  getStatusTitle,
  getStatusColor,
  getStatusBgColor,
} from "@/lib/progression";
import { cn } from "@/lib/utils";

interface UserMenuPanelProps {
  children: React.ReactNode;
}

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function UserMenuPanel({ children }: UserMenuPanelProps) {
  const navigate = useNavigate();
  const { user, walletAddress, disconnect, energy } = useWallet();
  const peBalance = usePeBalance(user?.id);
  const pixelStats = usePixelStats(user?.id);
  const [copied, setCopied] = useState(false);

  const country = getCountryByCode(user?.country_code);
  const xp = user?.xp || 0;
  const level = user?.level || calculateLevel(xp);
  const progress = levelProgress(xp);
  const statusTitle = getStatusTitle(level);
  const currentLevelXp = xpForLevel(level);
  const nextLevelXp = xpForNextLevel(level);

  const avatarGradient = generateAvatarGradient(walletAddress || "default");
  const avatarInitial = getAvatarInitial(user?.display_name, walletAddress);

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
        className="w-80 p-0 bg-popover/95 backdrop-blur-xl border-border/50 rounded-2xl shadow-xl z-50"
      >
        {/* User Header */}
        <div className="p-4">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt="Avatar"
                className="h-12 w-12 rounded-full object-cover border-2 border-border/50"
              />
            ) : (
              <div
                className="h-12 w-12 rounded-full flex items-center justify-center text-white font-bold text-lg border-2 border-border/50"
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
                  <Users className="h-3 w-3 text-primary" />
                  <span className="text-xs font-medium font-mono text-primary">
                    [{user.alliance_tag}]
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <Separator className="bg-border/50" />

        {/* Level & Progress */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn("p-1.5 rounded-lg", getStatusBgColor(level))}>
                <Star className={cn("h-4 w-4", getStatusColor(level))} />
              </div>
              <div>
                <p className="text-sm font-semibold">Level {level}</p>
                <p className={cn("text-xs font-medium", getStatusColor(level))}>
                  {statusTitle}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">
                {xp.toLocaleString()} XP
              </p>
            </div>
          </div>
          <div className="space-y-1">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{currentLevelXp.toLocaleString()}</span>
              <span>{nextLevelXp.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <Separator className="bg-border/50" />

        {/* Stats */}
        <div className="p-4 grid grid-cols-2 gap-3">
          <div className="p-2.5 rounded-xl bg-muted/50 border border-border/50">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Pixels Owned
            </p>
            <p className="text-sm font-semibold text-foreground">
              {pixelStats.pixelsOwned.toLocaleString()}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-muted/50 border border-border/50">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Total PE
            </p>
            <p className="text-sm font-semibold text-foreground">
              {peBalance.total.toLocaleString()}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-muted/50 border border-border/50">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {energy.nativeSymbol}
            </p>
            <p className="text-sm font-semibold text-foreground">
              {energy.nativeBalance.toFixed(4)}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-muted/50 border border-border/50">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Free PE
            </p>
            <p className="text-sm font-semibold text-foreground">
              {peBalance.free.toLocaleString()}
            </p>
          </div>
        </div>

        <Separator className="bg-border/50" />

        {/* Quick Links */}
        <div className="p-2">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 h-10 rounded-xl hover:bg-muted/50"
            onClick={() => navigate("/profile")}
          >
            <User className="h-4 w-4" />
            Profile
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 h-10 rounded-xl hover:bg-muted/50"
            onClick={() => navigate("/leaderboard")}
          >
            <BarChart3 className="h-4 w-4" />
            Leaderboard
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 h-10 rounded-xl hover:bg-muted/50"
            onClick={() => navigate("/rules")}
          >
            <BookOpen className="h-4 w-4" />
            Rules
          </Button>
        </div>

        <Separator className="bg-border/50" />

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
    </Popover>
  );
}
