import { PixelIcon } from "@/components/icons";
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
      icon={<PixelIcon name="book" size="md" />}
      size="md"
    >
      <div className="space-y-5 text-sm">
        {/* Pixel Energy */}
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <PixelIcon name="bolt" size="sm" />
            </div>
            <h3 className="font-semibold">Pixel Energy (PE)</h3>
          </div>
          <p className="text-muted-foreground pl-9">
            Your in-game energy. The more $BIT you hold in your wallet, the more PE you can use.
            Every action on the map—painting, defending, attacking, reinforcing—requires PE.
          </p>
          <p className="text-xs text-muted-foreground pl-9 italic">
            During the test phase, PE is calculated from your wallet's $SOL value.
          </p>
        </section>

        {/* The 4 Actions */}
        <section className="space-y-3">
          <h3 className="font-semibold">The 4 Actions</h3>
          
          <div className="grid gap-3 pl-1">
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-md bg-muted flex items-center justify-center shrink-0 mt-0.5">
                <PixelIcon name="brush" size="xs" />
              </div>
              <div>
                <p className="font-medium">Paint</p>
                <p className="text-xs text-muted-foreground">
                  Claim empty pixels. Costs 1 PE per pixel. Your initial stake determines how hard it is for others to take it from you.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-md bg-muted flex items-center justify-center shrink-0 mt-0.5">
                <PixelIcon name="shield" size="xs" />
              </div>
              <div>
                <p className="font-medium">Defend</p>
                <p className="text-xs text-muted-foreground">
                  Add PE to other players' pixels to help protect them. Your PE makes the pixel harder to attack.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-md bg-muted flex items-center justify-center shrink-0 mt-0.5">
                <PixelIcon name="swords" size="xs" />
              </div>
              <div>
                <p className="font-medium">Attack</p>
                <p className="text-xs text-muted-foreground">
                  Weaken other players' pixels with your PE. Once a pixel is weak enough, you can paint over it.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-md bg-muted flex items-center justify-center shrink-0 mt-0.5">
                <PixelIcon name="plus" size="xs" />
              </div>
              <div>
                <p className="font-medium">Reinforce</p>
                <p className="text-xs text-muted-foreground">
                  Add PE to your own pixels. The more PE a pixel has, the more resistant it is to attacks.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pixel Value */}
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <PixelIcon name="trendingDown" size="sm" />
            </div>
            <h3 className="font-semibold">Pixel Value</h3>
          </div>
          <p className="text-muted-foreground pl-9">
            Every pixel has a value determined by: how much PE the owner staked, plus any PE added by defenders, minus PE spent attacking it.
          </p>
          <p className="text-muted-foreground pl-9">
            When this value drops to zero (or below), anyone can claim the pixel by painting over it.
          </p>
        </section>

        {/* Takeover */}
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <PixelIcon name="flag" size="sm" />
            </div>
            <h3 className="font-semibold">Takeover</h3>
          </div>
          <p className="text-muted-foreground pl-9">
            To take over another player's pixel, you must stake more PE than the pixel's current value.
          </p>
          <div className="pl-9 text-xs text-muted-foreground space-y-1">
            <p>When you take over a pixel:</p>
            <ul className="list-disc list-inside pl-2 space-y-0.5">
              <li>You become the new owner</li>
              <li>The previous owner gets their PE back</li>
              <li>Defenders get their PE back</li>
              <li>Attackers automatically become your defenders</li>
            </ul>
          </div>
        </section>

        {/* Decay */}
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <PixelIcon name="clock" size="sm" />
            </div>
            <h3 className="font-semibold">Decay</h3>
          </div>
          <p className="text-muted-foreground pl-9">
            If your wallet value drops, you might have less PE than what you've staked on pixels.
          </p>
          <p className="text-muted-foreground pl-9">
            When this happens, your stake gradually decreases over 3 days.
          </p>
          <p className="text-muted-foreground pl-9">
            You can stop the decay immediately by restoring your wallet to the required value.
          </p>
        </section>

        {/* Glossary */}
        <section className="space-y-3">
          <h3 className="font-semibold">Glossary</h3>
          <div className="grid gap-2 text-xs">
            <div className="flex justify-between px-3 py-2 rounded-lg bg-muted/50">
              <span className="font-medium">PE</span>
              <span className="text-muted-foreground text-right">Pixel Energy – your power to act on the map</span>
            </div>
            <div className="flex justify-between px-3 py-2 rounded-lg bg-muted/50">
              <span className="font-medium">Stake</span>
              <span className="text-muted-foreground text-right">PE you've locked in a pixel</span>
            </div>
            <div className="flex justify-between px-3 py-2 rounded-lg bg-muted/50">
              <span className="font-medium">DEF</span>
              <span className="text-muted-foreground text-right">Defense – PE added by others to protect a pixel</span>
            </div>
            <div className="flex justify-between px-3 py-2 rounded-lg bg-muted/50">
              <span className="font-medium">ATK</span>
              <span className="text-muted-foreground text-right">Attack – PE spent by others to weaken a pixel</span>
            </div>
            <div className="flex justify-between px-3 py-2 rounded-lg bg-muted/50">
              <span className="font-medium">Takeover</span>
              <span className="text-muted-foreground text-right">Claiming a pixel after weakening it enough</span>
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
