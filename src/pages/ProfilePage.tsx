import { useState, useEffect } from "react";
import { PixelIcon } from "@/components/icons";
import { PEIcon } from "@/components/ui/pe-icon";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatCard } from "@/components/ui/stat-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CountryPicker } from "@/components/ui/country-picker";
import { useWallet } from "@/contexts/WalletContext";
import { usePeBalance } from "@/hooks/usePeBalance";
import { usePixelStats } from "@/hooks/usePixelStats";
import { ENERGY_ASSET } from "@/config/energy";
import { cn, formatUsd, formatNumber } from "@/lib/utils";
import { getAvatarInitial } from "@/lib/avatar";

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

  // Stats data
  const pixelsPainted = (user as any)?.pixels_painted_total || 0;
  
  const avatarInitial = getAvatarInitial(user?.display_name, walletAddress);

  return (
    <div className="min-h-full bg-background p-6 md:p-8 lg:p-12">
      <div className="max-w-3xl mx-auto space-y-8">
        <PageHeader
          icon={(props) => <PixelIcon name="user" {...props} />}
          title="Profile"
          subtitle="Your wallet, pixel ownership, and stake overview."
        />

        {/* Wallet Section */}
        <SectionCard icon={(props) => <PixelIcon name="wallet" {...props} />} title="Wallet">
          {!isConnected ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-4">
                <PixelIcon name="wallet" className="h-6 w-6 text-muted-foreground" />
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
                    <PixelIcon name="loader" className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <PixelIcon name="wallet" className="h-4 w-4 mr-2" />
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
                    <PixelIcon name="check" className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <PixelIcon name="copy" className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Energy Source Label */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 border border-primary/10 rounded-lg">
                  <PixelIcon name="bolt" className="h-4 w-4 text-primary" />
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
                  <PixelIcon
                    name="refresh"
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
                  value={formatNumber(energy.nativeBalance, 4)}
                  icon={(props) => <PixelIcon name="wallet" {...props} />}
                  helper={
                    energy.usdPrice > 0
                      ? `$${formatUsd(energy.usdPrice)}/$BIT`
                      : undefined
                  }
                />
                <StatCard
                  label="Wallet USD"
                  value={`$${formatUsd(energy.walletUsd)}`}
                  icon={(props) => <PixelIcon name="coins" {...props} />}
                  variant="muted"
                />
                <StatCard
                  label="Total PE"
                  value={energy.peTotal.toLocaleString()}
                  icon={(props) => <PixelIcon name="coins" {...props} />}
                  variant="primary"
                />
                <StatCard
                  label="Available PE"
                  value={peBalance.free.toLocaleString()}
                  icon={(props) => <PixelIcon name="coins" {...props} />}
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
                    Add $BIT to your Phantom wallet to get PE.
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

        {/* Stats Section - Only show when connected */}
        {isConnected && (
          <SectionCard icon={(props) => <PixelIcon name="chart" {...props} />} title="Stats">
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="Pixels Painted"
                value={pixelsPainted.toLocaleString()}
                icon={(props) => <PixelIcon name="brush" {...props} />}
              />
              <StatCard
                label="PE Used"
                value={energy.peUsed.toLocaleString()}
                icon={(props) => <PixelIcon name="coins" {...props} />}
                variant="primary"
              />
            </div>
          </SectionCard>
        )}

        {/* Profile Settings - Only show when connected */}
        {isConnected && (
          <SectionCard icon={(props) => <PixelIcon name="user" {...props} />} title="Profile Settings">
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
                    <PixelIcon name="loader" className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <PixelIcon name="check" className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </SectionCard>
        )}

        {/* Pixel Ownership */}
        <SectionCard icon={(props) => <PixelIcon name="grid3x3" {...props} />} title="Pixel Ownership">
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              label="Owned"
              value={pixelStats.pixelsOwned.toLocaleString()}
              icon={(props) => <PixelIcon name="grid3x3" {...props} />}
            />
            <StatCard
              label="PE Staked"
              value={pixelStats.totalStaked.toLocaleString()}
              icon={(props) => <PixelIcon name="coins" {...props} />}
            />
            <StatCard
              label="Total Value"
              value={(
                pixelStats.totalStaked +
                pixelStats.totalDefending -
                pixelStats.totalAttacking
              ).toLocaleString()}
              icon={(props) => <PEIcon size="sm" {...props} />}
              variant="primary"
            />
          </div>
        </SectionCard>

        {/* Active Stakes */}
        <SectionCard icon={(props) => <PixelIcon name="shield" {...props} />} title="Active Stakes">
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Defending"
              value={pixelStats.totalDefending.toLocaleString()}
              icon={(props) => <PixelIcon name="shield" {...props} />}
              variant="muted"
            />
            <StatCard
              label="Attacking"
              value={pixelStats.totalAttacking.toLocaleString()}
              icon={(props) => <PixelIcon name="swords" {...props} />}
              variant="muted"
            />
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

export default ProfilePage;
