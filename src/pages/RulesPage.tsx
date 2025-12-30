import { FileText, Coins, Shield, Swords, RefreshCw, Grid3X3, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const RulesPage = () => {
  return (
    <div className="min-h-full bg-background p-6 md:p-8 lg:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Bitplace Rules</h1>
          </div>
          <p className="text-muted-foreground">
            Learn how to claim, defend, and conquer pixels on the map.
          </p>
        </div>

        <Separator />

        {/* Token & Energy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-primary" />
              Token & Energy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p><strong>Token:</strong> BTP</p>
            <p><strong>Energy unit:</strong> PE (Pixel Energy)</p>
            <p><strong>1 PE = $0.001</strong> (derived from wallet value in BTP)</p>
          </CardContent>
        </Card>

        {/* Pixel Properties */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Grid3X3 className="h-5 w-5 text-primary" />
              Pixel Properties
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>Each pixel has:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li><code className="bg-muted px-1.5 py-0.5 rounded">owner</code> - Current owner wallet</li>
              <li><code className="bg-muted px-1.5 py-0.5 rounded">owner_stake</code> - PE staked by owner</li>
              <li><code className="bg-muted px-1.5 py-0.5 rounded">DEF</code> - PE contributed by defenders</li>
              <li><code className="bg-muted px-1.5 py-0.5 rounded">ATK</code> - PE contributed by attackers</li>
            </ul>
            <div className="mt-4 p-3 bg-muted rounded-lg font-mono text-sm">
              V = owner_stake + DEF - ATK
            </div>
          </CardContent>
        </Card>

        {/* DEF/ATK Rules */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <Swords className="h-5 w-5 text-destructive" />
              DEF/ATK Rules
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <ul className="list-disc list-inside space-y-2">
              <li><strong>One side per wallet:</strong> Either DEF or ATK (never both)</li>
              <li><strong>Owner restriction:</strong> Cannot DEF/ATK their own pixels; can only reinforce</li>
              <li><strong>Owned pixels only:</strong> DEF/ATK allowed only on non-empty pixels</li>
              <li><strong>Immediate withdrawals:</strong> DEF/ATK can be withdrawn instantly</li>
              <li><strong>No decay:</strong> If collateral lost, DEF/ATK disappear immediately</li>
            </ul>
          </CardContent>
        </Card>

        {/* Takeover & Flip */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Takeover & Flip
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="font-medium text-foreground mb-2">Takeover Threshold:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>If owner in rebalance with floor: <code className="bg-muted px-1.5 py-0.5 rounded">max(0, V_floor_next6h) + 1</code></li>
                <li>If owner healthy: <code className="bg-muted px-1.5 py-0.5 rounded">max(0, V_now) + 1</code></li>
                <li>Minimum threshold: <strong>1 PE</strong></li>
              </ul>
            </div>
            <Separator />
            <div>
              <p className="font-medium text-foreground mb-2">When Flip Occurs:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>New painter becomes owner</li>
                <li>Previous owner and defenders get PE refunded</li>
                <li>All attackers become defenders (can withdraw immediately)</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Rebalance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              Rebalance & Decay
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <ul className="list-disc list-inside space-y-2">
              <li>Floor updates every <strong>6 hours</strong> (12 ticks across 3 days)</li>
              <li>Only <code className="bg-muted px-1.5 py-0.5 rounded">owner_stake</code> can rebalance/decay</li>
              <li>Under-collateralized owners decay uniformly over 3 days</li>
              <li>Re-collateralization stops decay immediately</li>
            </ul>
          </CardContent>
        </Card>

        {/* Batch Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Batch / Area Selection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <ul className="list-disc list-inside space-y-2">
              <li>Manual drag selection on the map</li>
              <li>Actions apply to multiple pixels</li>
              <li>Uniform PE distribution per pixel</li>
              <li><strong>All-or-nothing:</strong> If any pixel fails validation, entire action fails</li>
            </ul>
          </CardContent>
        </Card>

        {/* Live System */}
        <Card>
          <CardHeader>
            <CardTitle>Live System</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>No pre-block/locking. Uses <strong>validate → commit</strong> flow.</p>
            <p className="mt-2">If state changes between validate and commit, the action fails.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RulesPage;
