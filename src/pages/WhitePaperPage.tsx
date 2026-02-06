import { Scroll, Globe, Coins, Users, Heart, Zap, Target } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";

const WhitePaperPage = () => {
  return (
    <div className="min-h-full bg-background p-6 md:p-8 lg:p-12">
      <div className="max-w-3xl mx-auto space-y-8">
        <PageHeader
          icon={Scroll}
          title="White Paper"
          subtitle="Understanding the soul of Bitplace"
        />

        {/* Hero Quote */}
        <div className="text-center py-6">
          <blockquote className="text-xl md:text-2xl font-medium text-foreground italic leading-relaxed">
            "The world map becomes a living canvas where every pixel tells a story of territory, identity, and community."
          </blockquote>
        </div>

        {/* The Vision */}
        <SectionCard icon={Globe} title="The Vision">
          <div className="space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              Bitplace transforms our shared world into a living canvas where territory is claimed not by force, 
              but by commitment. Every pixel on the map represents not just a location, but a statement—of identity, 
              community, and value.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              It's not just about painting. It's about expression, territory, and the communities that form 
              around protecting what matters to them.
            </p>
          </div>
        </SectionCard>

        {/* The Pixel Economy */}
        <SectionCard icon={Coins} title="The Pixel Economy">
          <div className="space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              When you paint a pixel, you're not just changing a color. You're staking your energy into that 
              piece of the world. That energy—your PE—comes from real value: your holdings in <strong className="text-foreground">$BIT</strong>.
            </p>
            <QuoteBlock>
              The more you care, the more you stake. The more you stake, the more you have at risk.
            </QuoteBlock>
            <p className="text-muted-foreground leading-relaxed">
              This creates a fundamental truth: ownership requires commitment. You can't claim territory 
              without having skin in the game.
            </p>
          </div>
        </SectionCard>

        {/* Human Dynamics */}
        <SectionCard icon={Users} title="Human Dynamics">
          <div className="space-y-5">
            <p className="text-muted-foreground leading-relaxed">
              Bitplace isn't played by algorithms—it's played by humans with motivations, emotions, and social bonds. 
              These dynamics create emergent gameplay that no ruleset could prescribe.
            </p>
            
            <div className="grid gap-4">
              <PlayerType
                emoji="🎨"
                title="The Artist"
                description="Creates for beauty, marks territory with expression. Artists turn the map into a gallery."
              />
              <PlayerType
                emoji="🛡️"
                title="The Guardian"
                description="Defends community works, builds reputation through protection. Guardians are the immune system."
              />
              <PlayerType
                emoji="⚔️"
                title="The Raider"
                description="Challenges ownership, tests defenses, creates chaos. Raiders keep everyone vigilant."
              />
              <PlayerType
                emoji="🤝"
                title="The Diplomat"
                description="Negotiates between factions, builds alliances. Diplomats shape the political landscape."
              />
              <PlayerType
                emoji="😈"
                title="The Griefier"
                description="Disrupts for entertainment, keeps everyone on their toes. Griefiers are the wild card."
              />
            </div>
          </div>
        </SectionCard>

        {/* Emotional Gameplay */}
        <SectionCard icon={Heart} title="Emotional Gameplay">
          <div className="space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              The best games create feelings. Bitplace is designed to evoke real emotions:
            </p>
            <ul className="space-y-3">
              <EmotionItem emoji="🎯" text="The thrill of claiming new territory" />
              <EmotionItem emoji="😰" text="The anxiety of seeing attacks on your pixels" />
              <EmotionItem emoji="😊" text="The satisfaction of defending community art" />
              <EmotionItem emoji="🔥" text="The drama of territorial wars" />
              <EmotionItem emoji="🤝" text="The bonds formed through alliance coordination" />
            </ul>
            <QuoteBlock>
              When you lose a pixel, you feel it. When you defend one, you celebrate. That's the game.
            </QuoteBlock>
          </div>
        </SectionCard>

        {/* Value Mechanics */}
        <SectionCard icon={Zap} title="Value Creation">
          <div className="space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              Value in Bitplace isn't artificial—it emerges from human behavior. The token and the map 
              exist in symbiosis.
            </p>
            
            <div className="grid gap-3">
              <ValueFlow
                step="1"
                title="Claim"
                description="$BIT is locked when you claim pixels. Skin in the game."
              />
              <ValueFlow
                step="2"
                title="Defend"
                description="Defenders add value to pixels. Community trust is staked."
              />
              <ValueFlow
                step="3"
                title="Attack"
                description="Attackers challenge value. The market tests your commitment."
              />
              <ValueFlow
                step="4"
                title="Conquest"
                description="Successful takeovers redistribute value. The cycle continues."
              />
            </div>

            <QuoteBlock>
              The map becomes more valuable as more people care about it. $BIT captures that care.
            </QuoteBlock>
          </div>
        </SectionCard>

        {/* The Token */}
        <SectionCard icon={Coins} title="The Token: $BIT">
          <div className="space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              $BIT isn't just a currency—it's your stake in the world.
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>Every pixel you own represents locked $BIT</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>Every defense you add represents trust</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>Every attack you launch represents a challenge</span>
              </li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              The token's value grows as the map becomes more contested, more defended, more alive. 
              Activity on the map is directly tied to $BIT's utility and demand.
            </p>
          </div>
        </SectionCard>

        {/* Strategic Depth */}
        <SectionCard icon={Target} title="The Game Within the Game">
          <div className="space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              Beyond simple painting lies a world of strategy:
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span><strong className="text-foreground">Territory control:</strong> Strategic positioning for maximum impact</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span><strong className="text-foreground">Reputation:</strong> Build influence through pixel ownership and defenses</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span><strong className="text-foreground">Community art:</strong> Coordinate with others to create lasting monuments</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span><strong className="text-foreground">Economic warfare:</strong> Target rivals strategically to drain their resources</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span><strong className="text-foreground">Diplomacy:</strong> Negotiate borders, form alliances, broker peace</span>
              </li>
            </ul>
          </div>
        </SectionCard>

        {/* Closing */}
        <div className="text-center py-8 border-t border-border/30">
          <p className="text-lg text-muted-foreground mb-4">
            Welcome to Bitplace.
          </p>
          <p className="text-2xl font-semibold text-foreground">
            Claim your piece of the world.
          </p>
        </div>
      </div>
    </div>
  );
};

// Helper Components
function QuoteBlock({ children }: { children: React.ReactNode }) {
  return (
    <blockquote className="border-l-2 border-primary/50 pl-4 py-2 italic text-foreground/80">
      {children}
    </blockquote>
  );
}

function PlayerType({ emoji, title, description }: { emoji: string; title: string; description: string }) {
  return (
    <div className="flex gap-3 p-3 rounded-lg bg-muted/30">
      <span className="text-xl">{emoji}</span>
      <div>
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function EmotionItem({ emoji, text }: { emoji: string; text: string }) {
  return (
    <li className="flex items-center gap-3 text-muted-foreground">
      <span className="text-lg">{emoji}</span>
      <span>{text}</span>
    </li>
  );
}

function ValueFlow({ step, title, description }: { step: string; title: string; description: string }) {
  return (
    <div className="flex gap-3 items-start">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
        {step}
      </span>
      <div>
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export default WhitePaperPage;
