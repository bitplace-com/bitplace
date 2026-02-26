import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PixelIcon } from "@/components/icons/PixelIcon";
import { PixelCheckCircle } from "@/components/icons/custom/PixelCheckCircle";
import { soundEngine } from "@/lib/soundEngine";
import * as React from "react";
interface WhitePaperModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
export function WhitePaperModal({
  open,
  onOpenChange
}: WhitePaperModalProps) {
  const prevOpenRef = React.useRef(open);
  React.useEffect(() => {
    if (open && !prevOpenRef.current) {
      soundEngine.play('modal_open');
    } else if (!open && prevOpenRef.current) {
      soundEngine.play('modal_close');
    }
    prevOpenRef.current = open;
  }, [open]);
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-border/50">
        <div className="p-6 md:p-8 space-y-8">
          {/* Hero */}
          <header className="text-center space-y-3 pt-2">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Paint the world bit by bit
            </h1>
            <p className="text-muted-foreground text-sm md:text-base max-w-md mx-auto">
              Bitplace is a world map where every pixel can be painted, defended, and contested.
            </p>
          </header>

          {/* Action Cards */}
          <section className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ActionCard icon={<PixelIcon name="brush" size="md" />} title="Paint" description="Color any pixel on the map. Stake paint energy to claim it. Your mark stays until someone paints over it." />
              <ActionCard icon={<PixelIcon name="shield" size="md" />} title="Defend" description="Add paint energy to protect any pixel. The more PE staked, the harder it is to Attack." />
              <ActionCard icon={<PixelIcon name="swords" size="md" />} title="Attack" description="Drain paint energy from pixels you want to repaint. Each Attack weakens the pixel. When it's weak enough, you can paint over it." />
              <ActionCard icon={<PixelIcon name="bolt" size="md" />} title="Reinforce" description="Add more paint energy to pixels you already painted. Strengthens your PE stake and makes your artwork harder to take." />
            </div>
           </section>

          {/* Getting Started (Free) */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Getting started (free)</h2>
            <p className="text-sm text-muted-foreground">
              You don't need a wallet or tokens to start. Sign in with Google and you'll receive{" "}
              <span className="text-foreground font-medium">300,000 VPE</span> (Virtual Paint Energy) — free energy to paint pixels and explore the map.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-3 flex-wrap">
              <span className="px-3 py-1.5 rounded-lg bg-muted">Sign in with Google</span>
              <span className="text-muted-foreground/50">→</span>
              <span className="px-3 py-1.5 rounded-lg bg-muted">Get 300k VPE</span>
              <span className="text-muted-foreground/50">→</span>
              <span className="px-3 py-1.5 rounded-lg bg-muted">Paint (72h)</span>
              <span className="text-muted-foreground/50">→</span>
              <span className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-medium">Want permanent? Get $BIT</span>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                VPE pixels are temporary — they expire after <span className="text-foreground font-medium">72 hours</span> and anyone can paint over them for free. But you can keep them alive: just repaint your pixel anytime before it expires and the <span className="text-foreground font-medium">72h timer resets</span>. Come back regularly to maintain your artwork. When a VPE pixel expires or is painted over, your VPE is recycled and you can use it again.
              </p>
              <p>
                To make your pixels permanent, defend them, or attack others — connect a Solana wallet with <span className="text-foreground font-medium">$BIT</span> tokens.
              </p>
            </div>
          </section>

          {/* Why It Matters */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Mechanics</h2>
            <div className="space-y-3 text-sm">
              <ReasonRow title="Real places" description="The map is Earth. Your paintings mark real locations." />
              <ReasonRow title="Visible commitment" description="Every action costs paint energy. You can see who cares about what." />
              <ReasonRow title="Real stakes" description="When someone paints over your pixel, you feel it. When you defend one, it means something." />
              <ReasonRow title="Emergent behavior" description="No rules about how to play. People coordinate, compete, disrupt, and create." />
            </div>
          </section>

          {/* How Value Works */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">How value works</h2>
            <p className="text-sm text-muted-foreground">
              Your <span className="text-foreground font-medium">$BIT</span> holdings determine your paint energy. More $BIT means more PE to spend on pixels.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-3 flex-wrap">
              <span className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-medium">Hold $BIT</span>
              <span className="text-muted-foreground/50">→</span>
              <span className="px-3 py-1.5 rounded-lg bg-muted">Get Paint Energy</span>
              <span className="text-muted-foreground/50">→</span>
              <span className="px-3 py-1.5 rounded-lg bg-muted">Paint Pixels</span>
              <span className="text-muted-foreground/50">→</span>
              <span className="px-3 py-1.5 rounded-lg bg-muted">Defend or Attack</span>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              When the map is active—pixels contested, defended, attacked—$BIT has utility. Utility creates demand.
            </p>
            <div className="flex gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                <PixelCheckCircle className="h-5 w-5" />
              </div>
              <p className="text-sm text-muted-foreground">
                <span className="text-foreground font-medium">Your $BIT is never spent.</span>{" "}
                Your token balance determines how much Paint Energy you receive — equal in dollar value to your $BIT holdings. Only PE is consumed when you paint, defend or attack. Your $BIT stays safe in your wallet at all times — Bitplace has no access to it and cannot move or spend your tokens.
              </p>
            </div>
          </section>

          {/* Your money, your choice */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Your money, your choice</h2>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                To play, you buy <span className="text-foreground font-medium">$BIT</span>. That's real money going in. But unlike traditional games, that money doesn't disappear into a company's pocket.
              </p>
              <p>
                Your $BIT stays yours. You can sell it anytime—if you lose interest, need the funds, or simply want out. There's no sunk cost. No subscription draining your wallet. No pay-to-win model enriching only the creators.
              </p>
              <p>
                All the value circulates within the community. Every $BIT holder shares in the ecosystem's worth. When the game grows, everyone who holds benefits—not a corporation sitting on top.
              </p>
              <p>
                Think of it this way: you're not spending money on a game. You're putting value into a system you can always take it back from.
              </p>
            </div>
          </section>

          {/* Value Creation */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Value creation</h2>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                Every action on the map requires paint energy. PE comes from holding{" "}
                <span className="text-foreground font-medium">$BIT</span>.
              </p>
              <p>
                When someone paints, defends, attacks, or reinforces, they lock $BIT into the system. 
                More locked $BIT means less circulating supply. Less supply, same demand: price rises.
              </p>
              <p>
                Here's the twist: when someone paints over your pixel, it stings. But to do it, they had to 
                stake more paint energy than was already there. That means more $BIT locked, more utility, more 
                value for everyone who holds.
              </p>
              <p>
                There's no free griefing. Every disruption costs. Every Attack funds the economy. 
                The more contested the map, the more valuable $BIT becomes.
              </p>
            </div>
          </section>

          {/* CTA */}
          <footer className="text-center pt-4 border-t border-border/30">
            <p className="text-foreground font-medium mb-4">Paint your first pixel.</p>
            <Button onClick={() => onOpenChange(false)} className="px-8">
              Open Map
            </Button>
          </footer>
        </div>
      </DialogContent>
    </Dialog>;
}
function ActionCard({
  icon,
  title,
  description
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return <div className="p-4 rounded-xl bg-card border border-border/50 space-y-2">
      <div className="flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
        <h3 className="font-semibold text-foreground">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>;
}
function ReasonRow({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  return <div className="flex gap-3">
      <span className="text-primary mt-0.5">•</span>
      <div>
        <span className="font-medium text-foreground">{title}.</span>{" "}
        <span className="text-muted-foreground">{description}</span>
      </div>
    </div>;
}