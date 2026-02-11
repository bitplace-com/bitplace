import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { icons } from "@/components/icons/iconRegistry";

export default function SpecPage() {
  return (
    <ScrollArea className="h-full">
      <div className="container max-w-4xl py-6 space-y-6">
        <PageHeader
          title="Bitplace Specifications"
          subtitle="Complete technical and functional specifications"
          icon={icons.book}
        />

        {/* 1. Overview */}
        <SectionCard title="Overview" icon={icons.globe}>
          <div className="space-y-3 text-sm">
            <p><strong>Product:</strong> Bitplace</p>
            <p><strong>Description:</strong> Interactive world map where users can paint, defend, and conquer pixels using cryptocurrency-backed energy.</p>
            <p><strong>Type:</strong> Web3 territorial strategy game with real-time multiplayer mechanics.</p>
          </div>
        </SectionCard>

        {/* 2. Token & Energy */}
        <SectionCard title="Token and Energy" icon={icons.bolt}>
          <div className="space-y-4 text-sm">
            <div>
              <p><strong>Token:</strong> BTP (currently uses SOL as proxy)</p>
              <p><strong>Energy Unit:</strong> PE (Pixel Energy)</p>
            </div>
            <div className="bg-muted/50 p-3 rounded-md font-mono text-xs">
              1 PE = $0.001 USD<br />
              1 USD = 1,000 PE
            </div>
            <p>PE is derived from the user's wallet value in BTP/SOL at current market price.</p>
          </div>
        </SectionCard>

        {/* 3. Pixel Grid System */}
        <SectionCard title="Pixel Grid System" icon={icons.grid3x3}>
          <div className="space-y-4 text-sm">
            <table className="w-full text-left">
              <tbody className="divide-y divide-border">
                <TableRow label="Projection" value="WebMercator (EPSG:3857)" />
                <TableRow label="Grid Zoom Level" value="12" />
                <TableRow label="Total Dimensions" value="2,097,152 × 2,097,152 pixels" />
                <TableRow label="Tile Size" value="512 × 512 pixels" />
                <TableRow label="Minimum Interaction Zoom" value="14 (cells render at 4px)" />
                <TableRow label="Total Tiles" value="4,096 × 4,096 = 16,777,216 tiles" />
              </tbody>
            </table>
            <div className="bg-muted/50 p-3 rounded-md font-mono text-xs">
              pixel_id = (y × 2,097,152) + x
            </div>
          </div>
        </SectionCard>

        {/* 4. Pixel Properties */}
        <SectionCard title="Pixel Properties" icon={icons.pixel}>
          <div className="space-y-4 text-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 font-medium">Property</th>
                  <th className="py-2 font-medium">Type</th>
                  <th className="py-2 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr><td className="py-2 font-mono text-xs">x, y</td><td className="py-2">integer</td><td className="py-2">Pixel coordinates (0 to 2,097,151)</td></tr>
                <tr><td className="py-2 font-mono text-xs">pixel_id</td><td className="py-2">bigint</td><td className="py-2">Unique identifier computed from x,y</td></tr>
                <tr><td className="py-2 font-mono text-xs">color</td><td className="py-2">string</td><td className="py-2">Hex color code (e.g., #FF5733)</td></tr>
                <tr><td className="py-2 font-mono text-xs">owner_user_id</td><td className="py-2">UUID</td><td className="py-2">Current owner's user ID</td></tr>
                <tr><td className="py-2 font-mono text-xs">owner_stake_pe</td><td className="py-2">integer</td><td className="py-2">PE staked by the owner</td></tr>
                <tr><td className="py-2 font-mono text-xs">def_total</td><td className="py-2">integer</td><td className="py-2">Total PE from defenders</td></tr>
                <tr><td className="py-2 font-mono text-xs">atk_total</td><td className="py-2">integer</td><td className="py-2">Total PE from attackers</td></tr>
              </tbody>
            </table>
            <div>
              <p className="font-medium mb-2">Pixel Value Formula:</p>
              <div className="bg-muted/50 p-3 rounded-md font-mono text-xs">
                V = owner_stake_pe + def_total - atk_total
              </div>
            </div>
          </div>
        </SectionCard>

        {/* 5. Available Actions */}
        <SectionCard title="Available Actions" icon={icons.brush}>
          <div className="space-y-4 text-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 font-medium">Action</th>
                  <th className="py-2 font-medium">Description</th>
                  <th className="py-2 font-medium">Target</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr><td className="py-2 font-mono text-xs">PAINT</td><td className="py-2">Claim empty pixels or takeover owned pixels</td><td className="py-2">Any pixel</td></tr>
                <tr><td className="py-2 font-mono text-xs">DEF</td><td className="py-2">Add defensive PE to others' pixels</td><td className="py-2">Others' pixels</td></tr>
                <tr><td className="py-2 font-mono text-xs">ATK</td><td className="py-2">Add offensive PE to weaken others' pixels</td><td className="py-2">Others' pixels</td></tr>
                <tr><td className="py-2 font-mono text-xs">REINFORCE</td><td className="py-2">Add PE to your own pixels</td><td className="py-2">Own pixels</td></tr>
                <tr><td className="py-2 font-mono text-xs">ERASE</td><td className="py-2">Remove your DEF/ATK contributions</td><td className="py-2">Own contributions</td></tr>
                <tr><td className="py-2 font-mono text-xs">WITHDRAW</td><td className="py-2">Remove stake from your pixels</td><td className="py-2">Own pixels</td></tr>
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* 6. Limits and Cooldown */}
        <SectionCard title="Limits and Cooldown" icon={icons.clock}>
          <div className="space-y-4 text-sm">
            <table className="w-full text-left">
              <tbody className="divide-y divide-border">
                <TableRow label="Max Pixels per PAINT" value="300 pixels" />
                <TableRow label="PAINT Cooldown" value="30 seconds" />
                <TableRow label="PE for Empty Pixel" value="1 PE minimum" />
              </tbody>
            </table>
            <div>
              <p className="font-medium mb-2">Takeover Cost Formula:</p>
              <div className="bg-muted/50 p-3 rounded-md font-mono text-xs">
                takeover_cost = max(0, V) + 1<br />
                where V = owner_stake_pe + def_total - atk_total
              </div>
            </div>
            <div>
              <p className="font-medium mb-2">Threshold with Rebalance:</p>
              <div className="bg-muted/50 p-3 rounded-md font-mono text-xs">
                if owner in rebalance: threshold = max(0, V_floor_next6h) + 1<br />
                if owner healthy: threshold = max(0, V_now) + 1<br />
                minimum threshold = 1 PE
              </div>
            </div>
          </div>
        </SectionCard>

        {/* 7. Level System */}
        <SectionCard title="Level System" icon={icons.trophy}>
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-medium mb-2">Level Formula:</p>
              <div className="bg-muted/50 p-3 rounded-md font-mono text-xs">
                level = min(100, floor(sqrt(pixels_painted_total / 10)) + 1)
              </div>
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 font-medium">Level Range</th>
                  <th className="py-2 font-medium">Status Title</th>
                  <th className="py-2 font-medium">Pixels Required</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr><td className="py-2">1 - 10</td><td className="py-2">Newcomer</td><td className="py-2">0 - 810</td></tr>
                <tr><td className="py-2">11 - 25</td><td className="py-2">Builder</td><td className="py-2">1,000 - 5,760</td></tr>
                <tr><td className="py-2">26 - 50</td><td className="py-2">Artist</td><td className="py-2">6,250 - 24,010</td></tr>
                <tr><td className="py-2">51 - 75</td><td className="py-2">Guardian</td><td className="py-2">25,000 - 54,760</td></tr>
                <tr><td className="py-2">76 - 99</td><td className="py-2">Veteran</td><td className="py-2">56,250 - 96,040</td></tr>
                <tr><td className="py-2">100</td><td className="py-2">Legend</td><td className="py-2">98,010+</td></tr>
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* 8. Rebalance/Decay System */}
        <SectionCard title="Rebalance and Decay" icon={icons.refresh}>
          <div className="space-y-4 text-sm">
            <table className="w-full text-left">
              <tbody className="divide-y divide-border">
                <TableRow label="Floor Update Interval" value="Every 6 hours" />
                <TableRow label="Total Decay Period" value="3 days (12 ticks)" />
                <TableRow label="Decay Target" value="owner_stake_pe only" />
              </tbody>
            </table>
            <div className="space-y-2">
              <p><strong>Trigger:</strong> Owner becomes under-collateralized (wallet value drops below staked PE)</p>
              <p><strong>Effect:</strong> owner_stake_pe decays uniformly across all owner's pixels over 3 days</p>
              <p><strong>Stop Condition:</strong> Re-collateralization stops decay immediately</p>
              <p><strong>DEF/ATK:</strong> Never decay; if contributor loses collateral, their DEF/ATK disappear instantly</p>
            </div>
          </div>
        </SectionCard>

        {/* 9. DEF/ATK Rules */}
        <SectionCard title="DEF/ATK Rules" icon={icons.shield}>
          <div className="space-y-3 text-sm">
            <ul className="list-disc list-inside space-y-2">
              <li>One side per wallet per pixel: either DEF or ATK, never both</li>
              <li>Owner cannot DEF or ATK their own pixels; owner can only REINFORCE</li>
              <li>DEF/ATK allowed only on owned (non-empty) pixels</li>
              <li>Withdrawals are immediate with no cooldown</li>
              <li>If a wallet loses collateral coverage, their DEF/ATK contributions disappear immediately</li>
              <li>DEF/ATK do not decay over time (only owner_stake decays)</li>
            </ul>
          </div>
        </SectionCard>

        {/* 10. Flip (Takeover) */}
        <SectionCard title="Flip (Pixel Takeover)" icon={icons.swords}>
          <div className="space-y-3 text-sm">
            <p>When a pixel is conquered via PAINT:</p>
            <ol className="list-decimal list-inside space-y-2">
              <li>New painter becomes owner</li>
              <li>Previous owner receives owner_stake_pe refund (unlocked)</li>
              <li>All previous defenders receive their DEF contributions refund</li>
              <li>All attackers become defenders (ATK converts to DEF)</li>
              <li>New owner's stake becomes the paint amount</li>
            </ol>
          </div>
        </SectionCard>

        {/* 11. Places System */}
        <SectionCard title="Places System" icon={icons.pin}>
          <div className="space-y-4 text-sm">
            <p>Users can save and share map locations as "Places".</p>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 font-medium">Field</th>
                  <th className="py-2 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr><td className="py-2 font-mono text-xs">title</td><td className="py-2">Place name (required)</td></tr>
                <tr><td className="py-2 font-mono text-xs">description</td><td className="py-2">Optional description</td></tr>
                <tr><td className="py-2 font-mono text-xs">lat, lng</td><td className="py-2">Geographic coordinates</td></tr>
                <tr><td className="py-2 font-mono text-xs">zoom</td><td className="py-2">Map zoom level</td></tr>
                <tr><td className="py-2 font-mono text-xs">bbox</td><td className="py-2">Bounding box (xmin, ymin, xmax, ymax)</td></tr>
                <tr><td className="py-2 font-mono text-xs">is_public</td><td className="py-2">Visibility setting</td></tr>
              </tbody>
            </table>
            <div>
              <p className="font-medium mb-2">Feed Types:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>New:</strong> Chronological order (most recent first)</li>
                <li><strong>Trending:</strong> Sorted by recent engagement activity</li>
                <li><strong>Popular:</strong> Sorted by total likes count</li>
              </ul>
            </div>
          </div>
        </SectionCard>

        {/* 12. Alliances System */}
        <SectionCard title="Alliances System" icon={icons.users}>
          <div className="space-y-4 text-sm">
            <table className="w-full text-left">
              <tbody className="divide-y divide-border">
                <TableRow label="Name" value="Unique alliance name" />
                <TableRow label="Tag" value="Unique short identifier (displayed with username)" />
              </tbody>
            </table>
            <div>
              <p className="font-medium mb-2">Roles:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Leader:</strong> Full control, can disband alliance</li>
                <li><strong>Officer:</strong> Can invite and manage members</li>
                <li><strong>Member:</strong> Standard membership</li>
              </ul>
            </div>
            <div>
              <p className="font-medium mb-2">Invite Status:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>PENDING: Awaiting response</li>
                <li>ACCEPTED: User joined alliance</li>
                <li>REJECTED: User declined invite</li>
              </ul>
            </div>
          </div>
        </SectionCard>

        {/* 13. Authentication */}
        <SectionCard title="Authentication" icon={icons.wallet}>
          <div className="space-y-4 text-sm">
            <p>Wallet-based authentication using Solana.</p>
            <div>
              <p className="font-medium mb-2">Authentication Flow:</p>
              <ol className="list-decimal list-inside space-y-2">
                <li>Client requests nonce from <span className="font-mono text-xs">auth-nonce</span> endpoint</li>
                <li>User signs nonce message with wallet</li>
                <li>Client sends signature to <span className="font-mono text-xs">auth-verify</span> endpoint</li>
                <li>Server verifies signature and issues JWT</li>
                <li>JWT used for all authenticated requests</li>
              </ol>
            </div>
            <div className="bg-muted/50 p-3 rounded-md font-mono text-xs">
              Message format: "Sign this message to authenticate: [nonce]"
            </div>
          </div>
        </SectionCard>

        {/* 14. Notifications */}
        <SectionCard title="Notification System" icon={icons.bell}>
          <div className="space-y-4 text-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 font-medium">Type</th>
                  <th className="py-2 font-medium">Trigger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr><td className="py-2 font-mono text-xs">PIXEL_TAKEOVER</td><td className="py-2">Your pixel was conquered by another player</td></tr>
                <tr><td className="py-2 font-mono text-xs">PIXEL_ATTACKED</td><td className="py-2">ATK contribution added to your pixel</td></tr>
                <tr><td className="py-2 font-mono text-xs">PIXEL_DEFENDED</td><td className="py-2">DEF contribution added to your pixel</td></tr>
              </tbody>
            </table>
            <p><strong>Delivery:</strong> Real-time via database subscriptions</p>
          </div>
        </SectionCard>

        {/* 15. Backend Architecture */}
        <SectionCard title="Backend Architecture" icon={icons.settings}>
          <div className="space-y-4 text-sm">
            <table className="w-full text-left">
              <tbody className="divide-y divide-border">
                <TableRow label="Database" value="PostgreSQL" />
                <TableRow label="Backend Functions" value="Edge Functions (Deno)" />
                <TableRow label="Real-time" value="WebSocket subscriptions" />
              </tbody>
            </table>
            <div>
              <p className="font-medium mb-2">Key Edge Functions:</p>
              <ul className="list-disc list-inside space-y-1 font-mono text-xs">
                <li>game-validate: Validates action before commit</li>
                <li>game-commit: Executes validated action atomically</li>
                <li>energy-refresh: Syncs wallet balance to PE</li>
                <li>rebalance-tick: Processes decay every 6 hours</li>
                <li>pixels-fetch-tiles: Retrieves pixel data for map tiles</li>
              </ul>
            </div>
            <div>
              <p className="font-medium mb-2">Action Flow:</p>
              <div className="bg-muted/50 p-3 rounded-md font-mono text-xs">
                1. Client calls game-validate with action payload<br />
                2. Server validates PE, permissions, state<br />
                3. If valid, client calls game-commit<br />
                4. Server re-validates and executes atomically<br />
                5. If state changed between validate/commit, action fails
              </div>
            </div>
          </div>
        </SectionCard>

        {/* 16. Color Palette */}
        <SectionCard title="Color Palette" icon={icons.pipette}>
          <div className="space-y-3 text-sm">
            <p>32-color palette organized in 4 rows of 8 colors.</p>
            <p>Colors range from grayscale to full spectrum including pastels and dark tones.</p>
            <p>Palette designed for pixel art with good contrast between adjacent colors.</p>
          </div>
        </SectionCard>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground py-6">
          Bitplace Specifications v1.0
        </div>
      </div>
    </ScrollArea>
  );
}

// Helper component for simple key-value rows
function TableRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td className="py-2 font-medium">{label}</td>
      <td className="py-2">{value}</td>
    </tr>
  );
}
