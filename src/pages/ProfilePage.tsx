import { User, Wallet, Grid3X3, Shield, Swords } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const ProfilePage = () => {
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
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-1">Connect your wallet to get started</p>
              <button className="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                Connect Wallet
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-secondary rounded-lg">
                <p className="text-muted-foreground">BTP Balance</p>
                <p className="text-lg font-semibold text-foreground">—</p>
              </div>
              <div className="p-3 bg-secondary rounded-lg">
                <p className="text-muted-foreground">Available PE</p>
                <p className="text-lg font-semibold text-foreground">—</p>
              </div>
            </div>
          </CardContent>
        </Card>

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
