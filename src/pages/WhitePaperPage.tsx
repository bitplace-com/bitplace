import { Button } from "@/components/ui/button";
import { PixelIcon } from "@/components/icons/PixelIcon";
import { useNavigate } from "react-router-dom";

const WhitePaperPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-full bg-background flex items-center justify-center p-6">
      <div className="max-w-2xl w-full space-y-8">
        {/* Hero */}
        <header className="text-center space-y-3">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Paint the world bit by bit.
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-md mx-auto">
            Bitplace is a world map where every pixel can be painted, defended, and contested.
          </p>
        </header>

        {/* Action Cards */}
        <section className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ActionCard
              icon={<PixelIcon name="brush" size="md" />}
              title="Paint"
              description="Color any pixel on the map. Stake energy to paint it. Your mark stays until someone paints over it."
            />
            <ActionCard
              icon={<PixelIcon name="shield" size="md" />}
              title="Defend"
              description="Add energy to protect any pixel. The more energy staked, the harder it is to Attack."
            />
            <ActionCard
              icon={<PixelIcon name="swords" size="md" />}
              title="Attack"
              description="Drain energy from pixels you want to repaint. Each Attack weakens the pixel. When it's weak enough, you can paint over it."
            />
            <ActionCard
              icon={<PixelIcon name="plus" size="md" />}
              title="Reinforce"
              description="Add more energy to pixels you already painted. Strengthens your stake and makes your artwork harder to take."
            />
          </div>
        </section>

        {/* Why It Matters */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Mechanics</h2>
          <div className="space-y-3">
            <ReasonRow
              title="Real places"
              description="The map is Earth. Your paintings mark real locations."
            />
            <ReasonRow
              title="Visible commitment"
              description="Every action costs energy. You can see who cares about what."
            />
            <ReasonRow
              title="Real stakes"
              description="When someone paints over your pixel, you feel it. When you defend one, it means something."
            />
            <ReasonRow
              title="Emergent behavior"
              description="No rules about how to play. People coordinate, compete, disrupt, and create."
            />
          </div>
        </section>

        {/* How Value Works */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">How value works</h2>
          <p className="text-muted-foreground">
            Your <span className="text-foreground font-medium">$BIT</span> holdings determine your energy. More $BIT means more energy to spend on pixels.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-4 flex-wrap">
            <span className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-medium">Hold $BIT</span>
            <span className="text-muted-foreground/50">→</span>
            <span className="px-3 py-1.5 rounded-lg bg-muted">Get Energy</span>
            <span className="text-muted-foreground/50">→</span>
            <span className="px-3 py-1.5 rounded-lg bg-muted">Paint Pixels</span>
            <span className="text-muted-foreground/50">→</span>
            <span className="px-3 py-1.5 rounded-lg bg-muted">Defend or Attack</span>
          </div>
          <p className="text-muted-foreground text-center">
            When the map is active—pixels contested, defended, attacked—$BIT has utility. Utility creates demand.
          </p>
        </section>

        {/* Value Creation */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Value creation</h2>
          <div className="space-y-3 text-muted-foreground">
            <p>
              Every action on the map requires energy. Energy comes from holding{" "}
              <span className="text-foreground font-medium">$BIT</span>.
            </p>
            <p>
              When someone paints, defends, attacks, or reinforces, they lock $BIT into the system. 
              More locked $BIT means less circulating supply. Less supply, same demand: price rises.
            </p>
            <p>
              Here's the twist: when someone paints over your pixel, it stings. But to do it, they had to 
              stake more energy than was already there. That means more $BIT locked, more utility, more 
              value for everyone who holds.
            </p>
            <p>
              There's no free griefing. Every disruption costs. Every Attack funds the economy. 
              The more contested the map, the more valuable $BIT becomes.
            </p>
          </div>
        </section>

        {/* CTA */}
        <footer className="text-center pt-6 border-t border-border/30">
          <p className="text-foreground font-medium text-lg mb-4">Paint your first pixel.</p>
          <Button 
            onClick={() => navigate("/")}
            size="lg"
            className="px-10"
          >
            Open Map
          </Button>
        </footer>
      </div>
    </div>
  );
};

function ActionCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-5 rounded-xl bg-card border border-border/50 space-y-2">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
        <h3 className="font-semibold text-foreground text-lg">{title}</h3>
      </div>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function ReasonRow({ title, description }: { title: string; description: string }) {
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

export default WhitePaperPage;
