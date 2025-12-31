import { useState, useEffect } from "react";
import { User, Wallet, Grid3X3, Shield, Swords, Save, Loader2, Coins } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatCard } from "@/components/ui/stat-card";
import { KeyValueRow } from "@/components/ui/key-value-row";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/contexts/WalletContext";

const ProfilePage = () => {
  const { isConnected, walletAddress, user, connect, updateUser, isConnecting } = useWallet();
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
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="font-mono text-sm text-foreground break-all">{walletAddress}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  label="BTP Balance"
                  value="—"
                  icon={Coins}
                  variant="muted"
                />
                <StatCard
                  label="Available PE"
                  value={user?.pe_total_pe?.toLocaleString() ?? "—"}
                  icon={Coins}
                  variant="primary"
                />
              </div>
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
