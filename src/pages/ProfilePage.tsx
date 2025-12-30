import { useState, useEffect } from "react";
import { User, Wallet, Grid3X3, Shield, Swords, Save, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <User className="h-5 w-5" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Profile</h1>
          </div>
          <p className="text-muted-foreground">
            Your wallet, pixel ownership, and stake overview.
          </p>
        </div>

        <Separator />

        {/* Wallet Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Wallet
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isConnected ? (
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-sm text-muted-foreground mb-1">Connect your wallet to get started</p>
                <Button 
                  onClick={connect} 
                  disabled={isConnecting}
                  className="mt-2"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    "Connect Wallet"
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Connected Wallet</p>
                  <p className="font-mono text-sm text-foreground break-all">{walletAddress}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 bg-secondary rounded-lg">
                    <p className="text-muted-foreground">BTP Balance</p>
                    <p className="text-lg font-semibold text-foreground">—</p>
                  </div>
                  <div className="p-3 bg-secondary rounded-lg">
                    <p className="text-muted-foreground">Available PE</p>
                    <p className="text-lg font-semibold text-foreground">
                      {user?.pe_total_pe?.toLocaleString() ?? "—"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Profile Settings - Only show when connected */}
        {isConnected && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Profile Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  placeholder="Enter your display name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={50}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="countryCode">Country Code</Label>
                  <Input
                    id="countryCode"
                    placeholder="US"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
                    maxLength={5}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="allianceTag">Alliance Tag</Label>
                  <Input
                    id="allianceTag"
                    placeholder="MOON"
                    value={allianceTag}
                    onChange={(e) => setAllianceTag(e.target.value.toUpperCase())}
                    maxLength={10}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="avatarUrl">Avatar URL</Label>
                <Input
                  id="avatarUrl"
                  placeholder="https://example.com/avatar.png"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  maxLength={500}
                />
              </div>
              <Button 
                onClick={handleSave} 
                disabled={isSaving || !hasChanges}
                className="w-full"
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
            </CardContent>
          </Card>
        )}

        {/* Pixel Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Grid3X3 className="h-5 w-5 text-primary" />
              Pixel Ownership
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="p-3 bg-secondary rounded-lg text-center">
                <p className="text-2xl font-bold text-foreground">0</p>
                <p className="text-muted-foreground">Owned</p>
              </div>
              <div className="p-3 bg-secondary rounded-lg text-center">
                <p className="text-2xl font-bold text-foreground">0</p>
                <p className="text-muted-foreground">PE Staked</p>
              </div>
              <div className="p-3 bg-secondary rounded-lg text-center">
                <p className="text-2xl font-bold text-foreground">0</p>
                <p className="text-muted-foreground">Total Value</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Stakes */}
        <Card>
          <CardHeader>
            <CardTitle>Active Stakes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Defending</span>
              </div>
              <span className="text-sm text-muted-foreground">0 pixels • 0 PE</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
              <div className="flex items-center gap-2">
                <Swords className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium">Attacking</span>
              </div>
              <span className="text-sm text-muted-foreground">0 pixels • 0 PE</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfilePage;
