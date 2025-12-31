import { useState, useEffect } from "react";
import { User, Wallet, Grid3X3, Shield, Swords, Save, Loader2, Coins, RefreshCw, Zap, DollarSign } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatCard } from "@/components/ui/stat-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/contexts/WalletContext";
import { usePeBalance } from "@/hooks/usePeBalance";
import { ENERGY_ASSET } from "@/config/energy";
import { cn } from "@/lib/utils";

const ProfilePage = () => {
  const { isConnected, walletAddress, user, connect, updateUser, isConnecting, energy, refreshEnergy } = useWallet();
  const peBalance = usePeBalance(user?.id);
  const [displayName, setDisplayName] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [allianceTag, setAllianceTag] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Sync form state with user data
  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || "");
      setCountryCode(user.country_code || "");
      setAllianceTag(user.alliance_tag || "");
      setAvatarUrl(user.avatar_url || "");
    }
  }, [user]);

  const handleSave = async () => {
    setIsSaving(true);
    await updateUser({
      display_name: displayName || null,
      country_code: countryCode || null,
      alliance_tag: allianceTag || null,
      avatar_url: avatarUrl || null,
    });
    setIsSaving(false);
  };

  const hasChanges = user && (
    displayName !== (user.display_name || "") ||
    countryCode !== (user.country_code || "") ||
    allianceTag !== (user.alliance_tag || "") ||
    avatarUrl !== (user.avatar_url || "")
  );

  const formatLastSync = (date: Date | null) => {
    if (!date) return 'Never';
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

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
                <span className="font-mono text-sm text-foreground break-all">{walletAddress}</span>
              </div>

              {/* Energy Source Label */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 border border-primary/10 rounded-lg">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium text-primary uppercase tracking-wider">
                    Energy source: {ENERGY_ASSET}
                  </span>
                  <span className="text-[10px] text-muted-foreground">(temporary)</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshEnergy}
                  disabled={energy.isRefreshing}
                  className="rounded-lg"
                >
                  <RefreshCw className={cn("h-4 w-4 mr-2", energy.isRefreshing && "animate-spin")} />
                  {energy.isRefreshing ? 'Refreshing...' : 'Refresh Balance'}
                </Button>
              </div>

              {/* Balance Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard
                  label={`${energy.nativeSymbol} Balance`}
                  value={energy.nativeBalance.toFixed(4)}
                  icon={Wallet}
                  helper={energy.usdPrice > 0 ? `$${energy.usdPrice.toFixed(2)}/SOL` : undefined}
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
                    Add {energy.nativeSymbol} to your Phantom wallet to get PE (temporary until BTP launches).
                  </p>
                  <p className="text-xs text-amber-600/80 mt-1">
                    1 PE = $0.001 • Your PE is calculated from your {energy.nativeSymbol} balance
                  </p>
                </div>
              )}
            </div>
          )}
        </SectionCard>

        {/* Profile Settings - Only show when connected */}
        {isConnected && (
          <SectionCard icon={User} title="Profile Settings">
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Display Name
                </Label>
                <Input
                  id="displayName"
                  placeholder="Enter your display name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={50}
                  className="rounded-xl border-border/50 focus:ring-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="countryCode" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Country Code
                  </Label>
                  <Input
                    id="countryCode"
                    placeholder="US"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
                    maxLength={5}
                    className="rounded-xl border-border/50 focus:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="allianceTag" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
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
              </div>
              <div className="space-y-2">
                <Label htmlFor="avatarUrl" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
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
              </div>
              <Button 
                onClick={handleSave} 
                disabled={isSaving || !hasChanges}
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
            <StatCard label="Owned" value="0" icon={Grid3X3} />
            <StatCard label="PE Staked" value="0" icon={Coins} />
            <StatCard label="Total Value" value="0" icon={Coins} />
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
              <span className="text-sm text-muted-foreground">0 pixels • 0 PE</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
                  <Swords className="h-4 w-4 text-rose-600" />
                </div>
                <span className="text-sm font-medium">Attacking</span>
              </div>
              <span className="text-sm text-muted-foreground">0 pixels • 0 PE</span>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

export default ProfilePage;
