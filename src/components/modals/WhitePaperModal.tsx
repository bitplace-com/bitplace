import { Button } from "@/components/ui/button";
import { PixelIcon } from "@/components/icons/PixelIcon";
import { PixelCheckCircle } from "@/components/icons/custom/PixelCheckCircle";
import { GamePanel } from "./GamePanel";
import * as React from "react";

interface WhitePaperModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WhitePaperModal({ open, onOpenChange }: WhitePaperModalProps) {
  return (
    <GamePanel
      open={open}
      onOpenChange={onOpenChange}
      title="How it works"
      icon={<PixelIcon name="book" size="md" />}
      size="md"
    >
      <div className="space-y-8">
        {/* Hero */}
        <header className="text-center space-y-3 pt-2">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Paint the world bit by bit
          </h2>
          <p className="text-muted-foreground text-sm md:text-base max-w-md mx-auto">
            Bitplace is a world map where every pixel can be painted, defended, and contested.
          </p>
        </header>

        {/* Action Cards */}
        <section className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ActionCard icon={<PixelIcon name="brush" size="md" />} title="Paint" description="Color any pixel on the map. Use paint energy to claim it. Your mark stays until someone paints over it." />
            <ActionCard icon={<PixelIcon name="shield" size="md" />} title="Defend" description="Add paint energy to protect any pixel. The more PE placed, the harder it is to take over." />
            <ActionCard icon={<PixelIcon name="swords" size="md" />} title="Attack" description="Drain paint energy from pixels you want to repaint. Each attack weakens the pixel. When it's weak enough, you can paint over it." />
            <ActionCard icon={<PixelIcon name="bolt" size="md" />} title="Reinforce" description="Add more paint energy to your own pixels. Strengthens your position and makes your artwork harder to take." />
          </div>
        </section>

        {/* Getting Started */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Getting started (free)</h2>
          <p className="text-sm text-muted-foreground">
            You don't need a wallet or tokens to start. Sign in with Google and you'll receive{" "}
            <span className="text-foreground font-medium">300,000 Pixels</span> — a free budget to paint and explore the map.
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-3 flex-wrap">
            <span className="px-3 py-1.5 rounded-lg bg-muted">Sign in with Google</span>
            <span className="text-muted-foreground/50">→</span>
            <span className="px-3 py-1.5 rounded-lg bg-muted">Get 300k Pixels</span>
            <span className="text-muted-foreground/50">→</span>
            <span className="px-3 py-1.5 rounded-lg bg-muted">Paint</span>
            <span className="text-muted-foreground/50">→</span>
            <span className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-medium">Want permanent? Get $BIT</span>
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              Your free pixels are temporary — they expire after <span className="text-foreground font-medium">72 hours</span> and anyone can paint over them. But you can keep them alive: before they expire, use the <span className="text-foreground font-medium">Pixel Control Center</span> to renew all your pixels at once with a single click. When a pixel expires or is painted over, it returns to your budget.
            </p>
            <p>
              To make your pixels permanent, defend them, or attack others — connect a Solana wallet with <span className="text-foreground font-medium">$BIT</span> tokens.
            </p>
          </div>
        </section>

        {/* Mechanics */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Mechanics</h2>
          <div className="space-y-3 text-sm">
            <ReasonRow title="Real places" description="The map is Earth. Your paintings mark real locations." />
            <ReasonRow title="Visible commitment" description="Every action costs paint energy. You can see who cares about what." />
            <ReasonRow title="Real consequences" description="When someone paints over your pixel, you feel it. When you defend one, it means something." />
            <ReasonRow title="Emergent behavior" description="No rules about how to play. People coordinate, compete, disrupt, and create." />
          </div>
        </section>

        {/* How Value Works */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">How value works</h2>
          <p className="text-sm text-muted-foreground">
            Your <span className="text-foreground font-medium">$BIT</span> balance determines your Paint Energy. More $BIT means more PE to use on the map.
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
          <div className="flex gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
              <PixelCheckCircle className="h-5 w-5" />
            </div>
            <p className="text-sm text-muted-foreground">
              <span className="text-foreground font-medium">Your $BIT is never spent.</span>{" "}
              Your token balance determines how much Paint Energy you receive. Only PE is used when you paint, defend, or attack. Your $BIT stays safe in your wallet — Bitplace has no access to it and cannot move your tokens.
            </p>
          </div>
        </section>

        {/* Your money, your choice */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Your money, your choice</h2>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              To play with real PE, you buy <span className="text-foreground font-medium">$BIT</span>. That's real money going in. But unlike traditional games, that money doesn't disappear into a company's pocket.
            </p>
            <p>
              Your $BIT stays yours. You can sell it anytime — if you lose interest, need the funds, or simply want out. There's no sunk cost. No subscription. No pay-to-win model.
            </p>
            <p>
              All the value circulates within the community. Every $BIT holder shares in the ecosystem's worth. When the game grows, everyone who holds benefits.
            </p>
          </div>
        </section>

        {/* Value Creation */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Value creation</h2>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              Every action on the map uses paint energy. PE comes from holding{" "}
              <span className="text-foreground font-medium">$BIT</span>.
            </p>
            <p>
              When someone paints, defends, attacks, or reinforces, they put PE into pixels.
              More PE placed means more demand for $BIT. More demand, same supply: value grows.
            </p>
            <p>
              There's no free disruption. Every attack costs PE. Every contest drives demand.
              The more active the map, the more valuable $BIT becomes.
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
    </GamePanel>
  );
}

function ActionCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-4 rounded-xl bg-card border border-border/50 space-y-2">
      <div className="flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
        <h3 className="font-semibold text-foreground">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function ReasonRow({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="text-primary mt-0.5">•</span>
      <div>
        <span className="font-medium text-foreground">{title}.</span>{" "}
        <span className="text-muted-foreground">{description}</span>
      </div>
    </div>
  );
}
