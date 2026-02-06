import { Scroll, Globe, Coins, Users, Heart, Zap } from "lucide-react";
import { GamePanel } from "./GamePanel";

interface WhitePaperModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WhitePaperModal({ open, onOpenChange }: WhitePaperModalProps) {
  return (
    <GamePanel
      open={open}
      onOpenChange={onOpenChange}
      title="White Paper"
      icon={<Scroll className="h-5 w-5" />}
      size="lg"
    >
      <div className="space-y-5 text-sm">
        {/* Hero Quote */}
        <blockquote className="text-base font-medium text-foreground italic text-center px-4">
          "The world map becomes a living canvas where every pixel tells a story."
        </blockquote>

        {/* The Vision */}
        <Section icon={Globe} title="The Vision">
          <p className="text-muted-foreground">
            Bitplace transforms our shared world into a living canvas where territory is claimed 
            by commitment. Every pixel represents identity, community, and value.
          </p>
        </Section>

        {/* The Pixel Economy */}
        <Section icon={Coins} title="The Pixel Economy">
          <p className="text-muted-foreground">
            When you paint a pixel, you stake your energy into that piece of the world. 
            Your PE comes from your <strong className="text-foreground">$BIT</strong> holdings—the more you care, the more you stake.
          </p>
        </Section>

        {/* Human Dynamics */}
        <Section icon={Users} title="Human Dynamics">
          <div className="grid gap-2">
            <PlayerRow emoji="🎨" title="Artist" desc="Creates for beauty" />
            <PlayerRow emoji="🛡️" title="Guardian" desc="Defends community works" />
            <PlayerRow emoji="⚔️" title="Raider" desc="Challenges ownership" />
            <PlayerRow emoji="🤝" title="Diplomat" desc="Builds alliances" />
            <PlayerRow emoji="😈" title="Griefier" desc="Keeps everyone vigilant" />
          </div>
        </Section>

        {/* Emotional Gameplay */}
        <Section icon={Heart} title="Emotional Gameplay">
          <p className="text-muted-foreground mb-2">
            The best games create feelings. Bitplace evokes real emotions:
          </p>
          <ul className="space-y-1 text-muted-foreground text-xs">
            <li>🎯 The thrill of claiming new territory</li>
            <li>😰 The anxiety of seeing attacks on your pixels</li>
            <li>😊 The satisfaction of defending community art</li>
            <li>🔥 The drama of territorial wars</li>
          </ul>
        </Section>

        {/* Value Creation */}
        <Section icon={Zap} title="Value Creation">
          <p className="text-muted-foreground mb-2">
            Value emerges from human behavior:
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <span className="px-2 py-1 rounded bg-muted">Claim</span>
            <span>→</span>
            <span className="px-2 py-1 rounded bg-muted">Defend</span>
            <span>→</span>
            <span className="px-2 py-1 rounded bg-muted">Attack</span>
            <span>→</span>
            <span className="px-2 py-1 rounded bg-muted">Conquest</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2 italic">
            The map becomes more valuable as more people care about it.
          </p>
        </Section>

        {/* The Token */}
        <Section icon={Coins} title="The Token: $BIT">
          <p className="text-muted-foreground">
            $BIT isn't just a currency—it's your stake in the world. Every pixel you own 
            represents locked $BIT. The token's value grows as the map becomes more contested, 
            more defended, more alive.
          </p>
        </Section>

        {/* CTA */}
        <div className="text-center pt-2 border-t border-border/30">
          <p className="text-foreground font-medium">
            Claim your piece of the world.
          </p>
        </div>
      </div>
    </GamePanel>
  );
}

// Helper Components
function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="pl-9">
        {children}
      </div>
    </section>
  );
}

function PlayerRow({ emoji, title, desc }: { emoji: string; title: string; desc: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span>{emoji}</span>
      <span className="font-medium text-foreground w-16">{title}</span>
      <span className="text-muted-foreground">{desc}</span>
    </div>
  );
}
