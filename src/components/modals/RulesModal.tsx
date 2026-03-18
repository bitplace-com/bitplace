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
        {/* SECTION 0: COMMUNITY RULES */}
        <div>
          <p className="px-1 mb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Community Rules
          </p>
          <div className="space-y-4">
            <RuleItem
              icon="eyeCross"
              title="No NSFW or Sexual Content"
              description="Pornographic, erotic, or sexualized imagery is forbidden — even if stylized, pixelated, or symbolic. Any sexualized depiction of minors is strictly prohibited. Bitplace must remain safe for all ages."
              variant="destructive"
            />
            <RuleItem
              icon="exclamationTriangle"
              title="No Hate or Harassment"
              description="Hate speech, threats, or targeting of individuals or groups based on identity (race, religion, gender, sexuality, disability, etc.) are prohibited, including hate symbols and extremist propaganda."
              variant="destructive"
            />
            <RuleItem
              icon="hockeyMask"
              title="No Violence or Illegal Content"
              description="Graphic violence, gore, or content that promotes or instructs illegal or dangerous activities is prohibited."
              variant="destructive"
            />
          </div>
        </div>

        {/* SECTION 1: GETTING STARTED */}
        <div>
          <p className="px-1 mb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Getting Started
          </p>
          <div className="space-y-4">
            <RuleItem
              icon="google"
              title="Bitplacer (Free)"
              description="Sign in with Google to get 300,000 Pixels — a free budget to paint and explore. Your pixels have no PE value, so anyone can paint over them, but they return to your budget when that happens."
            />
            <RuleItem
              icon="wallet"
              title="PRO (Wallet)"
              description="Connect a Solana wallet with $BIT tokens to unlock permanent pixels and all actions: Paint, Defend, Attack, and Reinforce. Your PE capacity depends on your $BIT balance."
            />
          </div>
        </div>

        {/* SECTION 2: PAINT ENERGY */}
        <div>
          <p className="px-1 mb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Paint Energy (PE)
          </p>
          <div className="space-y-4">
            <RuleItem
              icon="bolt"
              title="What is PE?"
              description="Paint Energy is the fuel for every action on the map. Your PE is calculated from the dollar value of $BIT in your wallet. Rate: $1 of $BIT = 1,000 PE. Your tokens are never spent — only PE is used."
            />
            <RuleItem
              icon="grid2x2"
              title="Pixel Balance"
              description="A free budget of 300,000 recyclable pixels for Bitplacer accounts. They have no PE value (anyone can paint over them). When painted over, they return to your budget automatically."
            />
          </div>
        </div>

        {/* SECTION 3: ACTIONS */}
        <div>
          <p className="px-1 mb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Actions
          </p>
          <div className="space-y-4">
            <RuleItem
              icon="brush"
              title="Paint"
              description="Color any pixel on the map. Use PE to claim it. Your pixel stays until someone takes it over."
            />
            <RuleItem
              icon="shield"
              title="Defend"
              description="Add PE to any pixel to make it harder to take over. Any player can defend any pixel — the more PE placed, the stronger the defense."
            />
            <RuleItem
              icon="swords"
              title="Attack"
              description="Use PE to weaken a pixel. Each attack drains its total value. When the value drops low enough, anyone can paint over it."
            />
            <RuleItem
              icon="bolt"
              title="Reinforce"
              description="Add more PE to pixels you already own. Strengthens your position and makes your artwork harder to take."
            />
          </div>
        </div>

        {/* SECTION 4: PIXEL VALUE & TAKEOVER */}
        <div>
          <p className="px-1 mb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Pixel Value & Takeover
          </p>
          <div className="space-y-4">
            <RuleItem
              icon="trendingDown"
              title="Pixel Value"
              description="A pixel's total strength in dollar terms. It equals the owner's PE plus defense, minus attacks. An empty pixel has a value of $0.001 (1 PE). Any pixel can be taken over — you just need to use more PE than its current value."
            />
            <RuleItem
              icon="flag"
              title="Takeover"
              description="When you paint over someone else's pixel by using more PE than its current value. When a takeover happens: you become the new owner, the previous owner gets their PE back, defenders get their PE back, and attackers become your new defenders."
            />
          </div>
        </div>

        {/* SECTION 5: DECAY & COLLATERALIZATION */}
        <div>
          <p className="px-1 mb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Decay & Collateralization
          </p>
          <div className="space-y-4">
            <RuleItem
              icon="clock"
              title="Decay"
              description="Your pixel PE stays valid for 7 days after your last wallet verification. If you don't reconnect within 7 days, PE gradually decreases over 72h to a minimum of 1 PE per pixel. Defense and attack contributions are not affected. Log in to reset the timer."
            />
            <RuleItem
              icon="shield"
              title="Collateralization"
              description="Your wallet's $BIT value backs your pixel PE. As long as your balance covers your total used PE, pixels remain at full strength. If your balance drops below your used PE, a 7-day grace period begins — after that, PE decreases over 72h to a floor of 1 PE. Restoring your balance stops the process instantly."
            />
          </div>
        </div>

        {/* QUICK REFERENCE */}
        <div>
          <p className="px-1 mb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Quick Reference
          </p>
          <div className="grid gap-2 text-xs">
            <RefRow term="PE" definition="Paint Energy — your capacity to act on the map" />
            <RefRow term="Used PE" definition="PE currently placed on pixels" />
            <RefRow term="DEF" definition="Defense — PE added by others to protect a pixel" />
            <RefRow term="ATK" definition="Attack — PE used by others to weaken a pixel" />
            <RefRow term="Takeover" definition="Claiming a pixel by using more PE than its value" />
            <RefRow term="Pixel Balance" definition="Free pixel budget for Bitplacer accounts" />
            <RefRow term="Decay" definition="Gradual PE reduction when wallet isn't verified" />
          </div>
        </div>
      </div>
    </GamePanel>
  );
}

function RuleItem({
  icon,
  title,
  description,
  variant = "primary",
}: {
  icon: string;
  title: string;
  description: string;
  variant?: "primary" | "destructive";
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${
          variant === "destructive" ? "bg-destructive/10" : "bg-primary/10"
        }`}>
          <PixelIcon name={icon as any} size="sm" />
        </div>
        <h3 className="font-semibold">{title}</h3>
      </div>
      <p className="text-muted-foreground pl-9">{description}</p>
    </section>
  );
}

function RefRow({ term, definition }: { term: string; definition: string }) {
  return (
    <div className="flex justify-between px-3 py-2 rounded-lg bg-muted/50">
      <span className="font-medium">{term}</span>
      <span className="text-muted-foreground text-right">{definition}</span>
    </div>
  );
}
