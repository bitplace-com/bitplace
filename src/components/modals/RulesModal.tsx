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
      icon={<PixelIcon name="info" size="md" />}
      size="md"
    >
      <div className="space-y-5 text-sm">
        {/* SECTION 0: RULES */}
        <div>
          <p className="px-1 mb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Rules
          </p>
          <div className="space-y-4">
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <PixelIcon name="eyeCross" size="sm" />
                </div>
                <h3 className="font-semibold">No NSFW or Sexual Content</h3>
              </div>
              <p className="text-muted-foreground pl-9">
                Pornographic, erotic, or sexualized imagery is forbidden — even if stylized, pixelated, or symbolic. Any sexualized depiction of minors is strictly prohibited. Bitplace must remain safe for all ages.
              </p>
            </section>

            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <PixelIcon name="exclamationTriangle" size="sm" />
                </div>
                <h3 className="font-semibold">No Hate or Harassment</h3>
              </div>
              <p className="text-muted-foreground pl-9">
                Hate speech, threats, or targeting of individuals or groups based on identity (race, religion, gender, sexuality, disability, etc.) are prohibited, including hate symbols and extremist propaganda.
              </p>
            </section>

            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <PixelIcon name="hockeyMask" size="sm" />
                </div>
                <h3 className="font-semibold">No Violence or Illegal Content</h3>
              </div>
              <p className="text-muted-foreground pl-9">
                Graphic violence, gore, or content that promotes or instructs illegal or dangerous activities is prohibited.
              </p>
            </section>
          </div>
        </div>

        {/* SECTION 1: ENERGY */}
        <div>
          <p className="px-1 mb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Energy
          </p>
          <div className="space-y-4">
            {/* PE */}
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <PixelIcon name="bolt" size="sm" />
                </div>
                <h3 className="font-semibold">Pixel Energy (PE)</h3>
              </div>
              <p className="text-muted-foreground pl-9">
                The unit of energy in Bitplace. Your PE capacity depends on the $ value of $BIT in your wallet. Every action on the map costs PE. You can see your current PE balance in the top bar. 1 PE = $0.001.
              </p>
            </section>

            {/* Stake */}
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <PixelIcon name="coins" size="sm" />
                </div>
                <h3 className="font-semibold">Stake</h3>
              </div>
              <p className="text-muted-foreground pl-9">
                The amount of PE you lock into a pixel when you paint or reinforce it. A higher stake makes the pixel harder for others to take. Your stake stays locked until someone takes over the pixel or you withdraw it.
              </p>
            </section>
          </div>
        </div>

        {/* SECTION 2: PIXEL MECHANICS */}
        <div>
          <p className="px-1 mb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Pixel Mechanics
          </p>
          <div className="space-y-4">
            {/* Pixel Value */}
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <PixelIcon name="trendingDown" size="sm" />
                </div>
                <h3 className="font-semibold">Pixel Value</h3>
              </div>
              <p className="text-muted-foreground pl-9">
                The total $ strength of a pixel. It equals the owner's stake plus any defense, minus any attacks received. An empty pixel has a value of $0.001 (1 PE). Any pixel can be taken over at any time — you just need to stake more PE than its current value. The lower the value, the cheaper it is to conquer.
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
                When you paint over a pixel owned by someone else. To do it, you must stake more PE than the pixel's current value.
              </p>
              <div className="pl-9 text-xs text-muted-foreground space-y-1">
                <p>When a takeover happens:</p>
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
                If the $ value of your wallet drops below what you've staked across all your pixels, your stakes start shrinking. The decay happens gradually over 3 days. You can stop it instantly by restoring your wallet's $ balance.
              </p>
            </section>
          </div>
        </div>

        {/* SECTION 3: QUICK REFERENCE */}
        <div>
          <p className="px-1 mb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Quick Reference
          </p>
          <div className="grid gap-2 text-xs">
            <div className="flex justify-between px-3 py-2 rounded-lg bg-muted/50">
              <span className="font-medium">PE</span>
              <span className="text-muted-foreground text-right">Pixel Energy — your capacity to act on the map</span>
            </div>
            <div className="flex justify-between px-3 py-2 rounded-lg bg-muted/50">
              <span className="font-medium">Stake</span>
              <span className="text-muted-foreground text-right">PE locked into a pixel to claim or strengthen it</span>
            </div>
            <div className="flex justify-between px-3 py-2 rounded-lg bg-muted/50">
              <span className="font-medium">DEF</span>
              <span className="text-muted-foreground text-right">Defense — PE added by other players to protect a pixel</span>
            </div>
            <div className="flex justify-between px-3 py-2 rounded-lg bg-muted/50">
              <span className="font-medium">ATK</span>
              <span className="text-muted-foreground text-right">Attack — PE spent by others to weaken a pixel</span>
            </div>
            <div className="flex justify-between px-3 py-2 rounded-lg bg-muted/50">
              <span className="font-medium">Takeover</span>
              <span className="text-muted-foreground text-right">Claiming a pixel by staking more PE than its current value</span>
            </div>
            <div className="flex justify-between px-3 py-2 rounded-lg bg-muted/50">
              <span className="font-medium">Decay</span>
              <span className="text-muted-foreground text-right">Gradual stake reduction when wallet balance drops</span>
            </div>
          </div>
        </div>

      </div>
    </GamePanel>
  );
}
