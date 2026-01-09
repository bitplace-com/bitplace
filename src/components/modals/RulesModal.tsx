import { Book, Paintbrush, Shield, Swords, Plus, Zap, TrendingDown } from "lucide-react";
import { GamePanel } from "./GamePanel";

interface RulesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RulesModal({ open, onOpenChange }: RulesModalProps) {
  return (
    <GamePanel
      open={open}
      onOpenChange={onOpenChange}
      title="Rules"
      icon={<Book className="h-5 w-5" />}
      size="md"
    >
      <div className="space-y-5 text-sm">
        {/* Pixel Energy */}
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="h-4 w-4" />
            </div>
            <h3 className="font-semibold">Pixel Energy (PE)</h3>
          </div>
          <p className="text-muted-foreground pl-9">
            Your PE is derived from your wallet's SOL holdings. Use PE to claim and protect pixels on the map.
          </p>
        </section>

        {/* Pixel Value */}
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingDown className="h-4 w-4" />
            </div>
            <h3 className="font-semibold">Pixel Value</h3>
          </div>
          <p className="text-muted-foreground pl-9">
            Each pixel has a <span className="font-mono text-foreground">Value = Owner stake + Defense − Attacks</span>. When value reaches zero, the pixel can be claimed.
          </p>
        </section>

        {/* Game Modes */}
        <section className="space-y-3">
          <h3 className="font-semibold">Game Modes</h3>
          
          <div className="grid gap-3 pl-1">
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-md bg-muted flex items-center justify-center shrink-0 mt-0.5">
                <Paintbrush className="h-3.5 w-3.5" />
              </div>
              <div>
                <p className="font-medium">Paint</p>
                <p className="text-xs text-muted-foreground">Claim unclaimed pixels. Costs 1 PE each.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-md bg-muted flex items-center justify-center shrink-0 mt-0.5">
                <Shield className="h-3.5 w-3.5" />
              </div>
              <div>
                <p className="font-medium">Defend</p>
                <p className="text-xs text-muted-foreground">Add PE to your pixels to increase their value.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-md bg-muted flex items-center justify-center shrink-0 mt-0.5">
                <Swords className="h-3.5 w-3.5" />
              </div>
              <div>
                <p className="font-medium">Attack</p>
                <p className="text-xs text-muted-foreground">Spend PE to reduce a pixel's value and claim it.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-md bg-muted flex items-center justify-center shrink-0 mt-0.5">
                <Plus className="h-3.5 w-3.5" />
              </div>
              <div>
                <p className="font-medium">Reinforce</p>
                <p className="text-xs text-muted-foreground">Help allies by adding PE to their pixels.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Glossary */}
        <section className="space-y-3">
          <h3 className="font-semibold">Glossary</h3>
          <div className="grid gap-2 text-xs">
            <div className="flex justify-between px-3 py-2 rounded-lg bg-muted/50">
              <span className="font-medium">PE</span>
              <span className="text-muted-foreground">Pixel Energy - your power derived from wallet value</span>
            </div>
            <div className="flex justify-between px-3 py-2 rounded-lg bg-muted/50">
              <span className="font-medium">Stake</span>
              <span className="text-muted-foreground">PE locked on pixels you own</span>
            </div>
            <div className="flex justify-between px-3 py-2 rounded-lg bg-muted/50">
              <span className="font-medium">DEF</span>
              <span className="text-muted-foreground">Defense value staked on pixels</span>
            </div>
            <div className="flex justify-between px-3 py-2 rounded-lg bg-muted/50">
              <span className="font-medium">ATK</span>
              <span className="text-muted-foreground">Attack power to reduce pixel value</span>
            </div>
            <div className="flex justify-between px-3 py-2 rounded-lg bg-muted/50">
              <span className="font-medium">Takeover</span>
              <span className="text-muted-foreground">When ATK reduces value to 0 and pixel is claimed</span>
            </div>
          </div>
        </section>

        {/* Tip */}
        <div className="p-3 rounded-lg bg-muted/50 border border-border">
          <p className="text-xs text-muted-foreground">
            Zoom in to paint level (z16+) to start placing pixels.
          </p>
        </div>
      </div>
    </GamePanel>
  );
}
