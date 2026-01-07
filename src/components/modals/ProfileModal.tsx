import { useState } from "react";
import {
  User,
  Wallet,
  Loader2,
  Coins,
  RefreshCw,
  Zap,
  DollarSign,
  Star,
  Copy,
  Check,
  Save,
} from "lucide-react";
import { GameModal } from "./GameModal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CountryPicker } from "@/components/ui/country-picker";
import { useWallet } from "@/contexts/WalletContext";
import { usePeBalance } from "@/hooks/usePeBalance";
import { ENERGY_ASSET } from "@/config/energy";
import { cn } from "@/lib/utils";
import { generateAvatarGradient, getAvatarInitial } from "@/lib/avatar";
import {
  levelProgress,
  getStatusTitle,
  getStatusColor,
  getStatusBgColor,
} from "@/lib/progression";

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const USERNAME_REGEX = /^[a-zA-Z0-9_]*$/;
const USERNAME_MIN = 3;
const USERNAME_MAX = 20;

export function ProfileModal({ open, onOpenChange }: ProfileModalProps) {
  const {
    isConnected,
    walletAddress,
    user,
    connect,
    updateUser,
    isConnecting,
    energy,
    refreshEnergy,
  } = useWallet();
  const peBalance = usePeBalance(user?.id);
  const [displayName, setDisplayName] = useState(user?.display_name || "");
  const [countryCode, setCountryCode] = useState<string | null>(user?.country_code || null);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  // Sync form state when modal opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && user) {
      setDisplayName(user.display_name || "");
      setCountryCode(user.country_code || null);
    }
    onOpenChange(newOpen);
  };

  const validateUsername = (value: string): string | null => {
    if (!value) return null;
    if (value.length < USERNAME_MIN) return `Min ${USERNAME_MIN} chars`;
    if (value.length > USERNAME_MAX) return `Max ${USERNAME_MAX} chars`;
    if (!USERNAME_REGEX.test(value)) return "Letters, numbers, _ only";
    return null;
  };

  const handleUsernameChange = (value: string) => {
    setDisplayName(value);
    setUsernameError(validateUsername(value));
  };

  const handleSave = async () => {
    const error = validateUsername(displayName);
    if (error) {
      setUsernameError(error);
      return;
    }
    setIsSaving(true);
    await updateUser({
      display_name: displayName || null,
      country_code: countryCode || null,
    });
    setIsSaving(false);
  };

  const handleCopyAddress = async () => {
    if (walletAddress) {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const hasChanges =
    user &&
    (displayName !== (user.display_name || "") ||
      countryCode !== (user.country_code || null));

  const xp = user?.xp || 0;
  const level = user?.level || 1;
  const progress = levelProgress(xp);
  const statusTitle = getStatusTitle(level);
  const avatarGradient = generateAvatarGradient(walletAddress || "default");
  const avatarInitial = getAvatarInitial(user?.display_name, walletAddress);

  return (
    <GameModal
      open={open}
      onOpenChange={handleOpenChange}
      title="Profile"
      icon={<User className="h-5 w-5" />}
      className="max-w-md"
    >
      {!isConnected ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-4">
            <Wallet className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Connect your wallet to view your profile
          </p>
          <Button onClick={connect} disabled={isConnecting} className="rounded-xl">
            {isConnecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Wallet className="h-4 w-4 mr-2" />
                Connect Wallet
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Avatar + Level */}
          <div className="flex items-center gap-3">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt="Avatar"
                className="h-14 w-14 rounded-full object-cover border-2 border-border/50"
              />
            ) : (
              <div
                className="h-14 w-14 rounded-full flex items-center justify-center text-white font-bold text-lg border-2 border-border/50"
                style={{ background: avatarGradient }}
              >
                {avatarInitial}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className={cn("p-1 rounded-md", getStatusBgColor(level))}>
                  <Star className={cn("h-3.5 w-3.5", getStatusColor(level))} />
                </div>
                <span className="font-semibold">Level {level}</span>
                <span className={cn("text-xs", getStatusColor(level))}>{statusTitle}</span>
              </div>
              <div className="mt-1">
                <Progress value={progress} className="h-2" />
                <p className="text-[10px] text-muted-foreground mt-0.5">{xp.toLocaleString()} XP</p>
              </div>
            </div>
          </div>

          {/* Wallet Address */}
          <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
            <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="font-mono text-xs text-foreground truncate flex-1">
              {walletAddress}
            </span>
            <Button variant="ghost" size="sm" onClick={handleCopyAddress} className="h-7 w-7 p-0">
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>

          {/* PE Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 bg-muted/30 rounded-lg text-center">
              <Coins className="h-4 w-4 mx-auto text-primary mb-1" />
              <p className="text-sm font-semibold">{energy.peTotal.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">Total PE</p>
            </div>
            <div className="p-2 bg-muted/30 rounded-lg text-center">
              <Zap className="h-4 w-4 mx-auto text-amber-500 mb-1" />
              <p className="text-sm font-semibold">{peBalance.free.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">Available</p>
            </div>
            <div className="p-2 bg-muted/30 rounded-lg text-center">
              <DollarSign className="h-4 w-4 mx-auto text-emerald-500 mb-1" />
              <p className="text-sm font-semibold">${energy.walletUsd.toFixed(2)}</p>
              <p className="text-[10px] text-muted-foreground">USD Value</p>
            </div>
          </div>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={refreshEnergy}
            disabled={energy.isRefreshing}
            className="w-full rounded-lg"
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", energy.isRefreshing && "animate-spin")} />
            {energy.isRefreshing ? "Refreshing..." : `Refresh ${ENERGY_ASSET} Balance`}
          </Button>

          {/* Quick Profile Edit */}
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-xs">Username</Label>
              <Input
                id="username"
                placeholder="Enter username"
                value={displayName}
                onChange={(e) => handleUsernameChange(e.target.value)}
                maxLength={USERNAME_MAX}
                className={cn("h-9 rounded-lg", usernameError && "border-destructive")}
              />
              {usernameError && <p className="text-[10px] text-destructive">{usernameError}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Country</Label>
              <CountryPicker value={countryCode} onChange={setCountryCode} placeholder="Select country..." />
            </div>

            <Button
              onClick={handleSave}
              disabled={isSaving || !hasChanges || !!usernameError}
              className="w-full rounded-lg"
              size="sm"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </GameModal>
  );
}
