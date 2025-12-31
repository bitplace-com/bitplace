import { Book, Paintbrush, Shield, Swords, Plus } from "lucide-react";
import { GameModal } from "./GameModal";

interface RulesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RulesModal({ open, onOpenChange }: RulesModalProps) {
  return (
    <GameModal
      open={open}
      onOpenChange={onOpenChange}
      title="Game Rules"
      description="How to play Bitplace"
      icon={<Book className="h-5 w-5" />}
    >
      <div className="space-y-4 text-sm text-foreground/80">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 text-primary shrink-0">
            <Paintbrush className="h-4 w-4" />
          </div>
          <div>
            <p className="font-medium text-foreground">Paint</p>
            <p className="text-muted-foreground">Claim unclaimed pixels or pixels you already own. Costs 1 PE per pixel.</p>
          </div>
        </div>
        
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 text-primary shrink-0">
            <Shield className="h-4 w-4" />
          </div>
          <div>
            <p className="font-medium text-foreground">Defend</p>
            <p className="text-muted-foreground">Add PE to your owned pixels to make them harder to attack.</p>
          </div>
        </div>
        
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 text-primary shrink-0">
            <Swords className="h-4 w-4" />
          </div>
          <div>
            <p className="font-medium text-foreground">Attack</p>
            <p className="text-muted-foreground">Spend PE to attack other players' pixels and claim them.</p>
          </div>
        </div>
        
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 text-primary shrink-0">
            <Plus className="h-4 w-4" />
          </div>
          <div>
            <p className="font-medium text-foreground">Reinforce</p>
            <p className="text-muted-foreground">Add PE to allies' pixels to help defend them.</p>
          </div>
        </div>
        
        <div className="pt-2 border-t border-border/50">
          <p className="text-xs text-muted-foreground">
            Zoom in to paint level (z16+) to start placing pixels. Your PE (Pixel Energy) is derived from your SOL holdings.
          </p>
        </div>
      </div>
    </GameModal>
  );
}
