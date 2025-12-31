import { Users, Flag } from "lucide-react";
import { GameModal } from "./GameModal";

interface AllianceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AllianceModal({ open, onOpenChange }: AllianceModalProps) {
  return (
    <GameModal
      open={open}
      onOpenChange={onOpenChange}
      title="Alliances"
      description="Join forces with other players"
      icon={<Users className="h-5 w-5" />}
    >
      <div className="space-y-4">
        <div className="text-center py-8 text-muted-foreground text-sm">
          <Flag className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="font-medium text-foreground mb-1">Coming Soon</p>
          <p>Create or join alliances to defend territory together</p>
        </div>
        
        <div className="grid grid-cols-2 gap-3 text-center text-xs">
          <div className="p-3 rounded-xl bg-muted/50 border border-border/50">
            <p className="font-medium text-foreground">Shared Defense</p>
            <p className="text-muted-foreground mt-1">Pool PE to defend alliance pixels</p>
          </div>
          <div className="p-3 rounded-xl bg-muted/50 border border-border/50">
            <p className="font-medium text-foreground">Territory Tags</p>
            <p className="text-muted-foreground mt-1">Mark your alliance territory</p>
          </div>
        </div>
      </div>
    </GameModal>
  );
}
