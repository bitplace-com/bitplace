import { useState, useEffect } from "react";
import {
  User,
  Wallet,
  Grid3X3,
  Shield,
  Swords,
  Save,
  Loader2,
  Coins,
  RefreshCw,
  Zap,
  DollarSign,
  Star,
  Copy,
  Check,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatCard } from "@/components/ui/stat-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CountryPicker } from "@/components/ui/country-picker";
import { useWallet } from "@/contexts/WalletContext";
import { usePeBalance } from "@/hooks/usePeBalance";
import { usePixelStats } from "@/hooks/usePixelStats";
import { ENERGY_ASSET } from "@/config/energy";
import { cn } from "@/lib/utils";
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

const USERNAME_REGEX = /^[a-zA-Z0-9_]*$/;
const USERNAME_MIN = 3;
const USERNAME_MAX = 20;

const ProfilePage = () => {
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
  const pixelStats = usePixelStats(user?.id);
  const [displayName, setDisplayName] = useState("");
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [allianceTag, setAllianceTag] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  // Sync form state with user data
  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || "");
      setCountryCode(user.country_code || null);
      setAllianceTag(user.alliance_tag || "");
      setAvatarUrl(user.avatar_url || "");
    }
  }, [user]);

  // Validate username
  const validateUsername = (value: string): string | null => {
    if (!value) return null;
    if (value.length < USERNAME_MIN)
      return `Must be at least ${USERNAME_MIN} characters`;
    if (value.length > USERNAME_MAX)
      return `Must be under ${USERNAME_MAX} characters`;
    if (!USERNAME_REGEX.test(value))
      return "Only letters, numbers, and underscores allowed";
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
      alliance_tag: allianceTag || null,
      avatar_url: avatarUrl || null,
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
      countryCode !== (user.country_code || null) ||
      allianceTag !== (user.alliance_tag || "") ||
      avatarUrl !== (user.avatar_url || ""));

  const formatLastSync = (date: Date | null) => {
    if (!date) return "Never";
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  // Progression data
  const xp = user?.xp || 0;
  const level = user?.level || calculateLevel(xp);
  const progress = levelProgress(xp);
  const statusTitle = getStatusTitle(level);
  const currentLevelXp = xpForLevel(level);
  const nextLevelXp = xpForNextLevel(level);
  const avatarGradient = generateAvatarGradient(walletAddress || "default");
  const avatarInitial = getAvatarInitial(user?.display_name, walletAddress);

  return (
    <div className="min-h-full bg-background p-6 md:p-8 lg:p-12">
      <div className="max-w-3xl mx-auto space-y-8">
        <PageHeader
          icon={User}
          title="Profile"
          subtitle="Your wallet, pixel ownership, and stake overview."
        />

        {/* Wallet Section */}
        <SectionCard icon={Wallet} title="Wallet">
          {!isConnected ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-4">
                <Wallet className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Connect your wallet to get started with Bitplace
              </p>
              <Button
                onClick={connect}
                disabled={isConnecting}
                className="rounded-xl"
              >
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
            <div className="space-y-5">
              {/* Wallet Address */}
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="font-mono text-sm text-foreground break-all flex-1">
                  {walletAddress}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyAddress}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Energy Source Label */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 border border-primary/10 rounded-lg">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium text-primary uppercase tracking-wider">
                    Energy source: {ENERGY_ASSET}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    (temporary)
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshEnergy}
                  disabled={energy.isRefreshing}
                  className="rounded-lg"
                >
                  <RefreshCw
                    className={cn(
                      "h-4 w-4 mr-2",
                      energy.isRefreshing && "animate-spin"
                    )}
                  />
                  {energy.isRefreshing ? "Refreshing..." : "Refresh Balance"}
                </Button>
              </div>

              {/* Balance Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard
                  label={`${energy.nativeSymbol} Balance`}
                  value={energy.nativeBalance.toFixed(4)}
                  icon={Wallet}
                  helper={
                    energy.usdPrice > 0
                      ? `$${energy.usdPrice.toFixed(2)}/SOL`
                      : undefined
                  }
                />
                <StatCard
                  label="Wallet USD"
                  value={`$${energy.walletUsd.toFixed(2)}`}
                  icon={DollarSign}
                  variant="muted"
                />
                <StatCard
                  label="Total PE"
                  value={energy.peTotal.toLocaleString()}
                  icon={Coins}
                  variant="primary"
                />
                <StatCard
                  label="Available PE"
                  value={peBalance.free.toLocaleString()}
                  icon={Coins}
                  helper={`Locked: ${peBalance.locked.toLocaleString()}`}
                />
              </div>

              {/* Last Sync Info */}
              <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <span>Last synced: {formatLastSync(energy.lastSyncAt)}</span>
                {energy.isStale && (
                  <span className="text-amber-600">Balance may be outdated</span>
                )}
              </div>

              {/* Insufficient PE Warning */}
              {energy.peTotal < 1 && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <p className="text-sm text-amber-700 font-medium">
                    Add {energy.nativeSymbol} to your Phantom wallet to get PE
                    (temporary until BTP launches).
                  </p>
                  <p className="text-xs text-amber-600/80 mt-1">
                    1 PE = $0.001 • Your PE is calculated from your{" "}
                    {energy.nativeSymbol} balance
                  </p>
                </div>
              )}
            </div>
          )}
        </SectionCard>

        {/* Progression Section - Only show when connected */}
        {isConnected && (
          <SectionCard icon={Star} title="Progression">
            <div className="space-y-4">
              {/* Avatar + Level Header */}
              <div className="flex items-center gap-4">
                {/* Avatar Preview */}
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt="Avatar"
                    className="h-16 w-16 rounded-full object-cover border-2 border-border/50"
                  />
                ) : (
                  <div
                    className="h-16 w-16 rounded-full flex items-center justify-center text-white font-bold text-xl border-2 border-border/50"
                    style={{ background: avatarGradient }}
                  >
                    {avatarInitial}
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn("p-1.5 rounded-lg", getStatusBgColor(level))}
                    >
                      <Star className={cn("h-4 w-4", getStatusColor(level))} />
                    </div>
                    <div>
                      <p className="text-lg font-semibold">Level {level}</p>
                      <p
                        className={cn("text-sm font-medium", getStatusColor(level))}
                      >
                        {statusTitle}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{xp.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total XP</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progress to Level {level + 1}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-3" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{currentLevelXp.toLocaleString()} XP</span>
                  <span>{nextLevelXp.toLocaleString()} XP</span>
                </div>
              </div>

              {/* XP Info */}
              <div className="p-3 bg-muted/30 rounded-xl">
                <p className="text-xs text-muted-foreground">
                  Earn XP by painting pixels (+1), conquering pixels (+2), and
                  participating in DEF/ATK actions (+1 per 10 pixels).
                </p>
              </div>
            </div>
          </SectionCard>
        )}

        {/* Profile Settings - Only show when connected */}
        {isConnected && (
          <SectionCard icon={User} title="Profile Settings">
            <div className="space-y-5">
              {/* Username with validation */}
              <div className="space-y-2">
                <Label
                  htmlFor="displayName"
                  className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                >
                  Username
                </Label>
                <div className="relative">
                  <Input
                    id="displayName"
                    placeholder="Enter your username"
                    value={displayName}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    maxLength={USERNAME_MAX}
                    className={cn(
                      "rounded-xl border-border/50 focus:ring-primary",
                      usernameError && "border-destructive"
                    )}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    {displayName.length}/{USERNAME_MAX}
                  </span>
                </div>
                {usernameError && (
                  <p className="text-xs text-destructive">{usernameError}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  3-20 characters, letters, numbers, and underscores only
                </p>
              </div>

              {/* Country Picker */}
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Country
                </Label>
                <CountryPicker
                  value={countryCode}
                  onChange={setCountryCode}
                  placeholder="Select your country..."
                />
              </div>

              {/* Alliance Tag */}
              <div className="space-y-2">
                <Label
                  htmlFor="allianceTag"
                  className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                >
                  Alliance Tag
                </Label>
                <Input
                  id="allianceTag"
                  placeholder="MOON"
                  value={allianceTag}
                  onChange={(e) => setAllianceTag(e.target.value.toUpperCase())}
                  maxLength={10}
                  className="rounded-xl border-border/50 focus:ring-primary"
                />
              </div>

              {/* Avatar URL */}
              <div className="space-y-2">
                <Label
                  htmlFor="avatarUrl"
                  className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                >
                  Avatar URL
                </Label>
                <Input
                  id="avatarUrl"
                  placeholder="https://example.com/avatar.png"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  maxLength={500}
                  className="rounded-xl border-border/50 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty for auto-generated avatar
                </p>
              </div>

              <Button
                onClick={handleSave}
                disabled={isSaving || !hasChanges || !!usernameError}
                className="w-full rounded-xl"
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
          </SectionCard>
        )}

        {/* Pixel Ownership */}
        <SectionCard icon={Grid3X3} title="Pixel Ownership">
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              label="Owned"
              value={pixelStats.pixelsOwned.toLocaleString()}
              icon={Grid3X3}
            />
            <StatCard
              label="PE Staked"
              value={pixelStats.totalStaked.toLocaleString()}
              icon={Coins}
            />
            <StatCard
              label="Total Value"
              value={(
                pixelStats.totalStaked +
                pixelStats.totalDefending +
                pixelStats.totalAttacking
              ).toLocaleString()}
              icon={Coins}
            />
          </div>
        </SectionCard>

        {/* Active Stakes */}
        <SectionCard title="Active Stakes">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-emerald-600" />
                </div>
                <span className="text-sm font-medium">Defending</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {pixelStats.totalDefending.toLocaleString()} PE
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
                  <Swords className="h-4 w-4 text-rose-600" />
                </div>
                <span className="text-sm font-medium">Attacking</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {pixelStats.totalAttacking.toLocaleString()} PE
              </span>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

export default ProfilePage;
