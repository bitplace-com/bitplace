import { ShoppingBag, Coins } from "lucide-react";
import { GameModal } from "./GameModal";

interface ShopModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShopModal({ open, onOpenChange }: ShopModalProps) {
  return (
    <GameModal
      open={open}
      onOpenChange={onOpenChange}
      title="Shop"
      description="Acquire PE and power-ups"
      icon={<ShoppingBag className="h-5 w-5" />}
    >
      <div className="space-y-4">
        <div className="text-center py-8 text-muted-foreground text-sm">
          <Coins className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="font-medium text-foreground mb-1">Coming Soon</p>
          <p>Purchase PE, boosts, and exclusive items</p>
        </div>
        
        <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
          <p className="text-xs text-primary">
            For now, your PE is derived from your SOL wallet balance. More options coming soon!
          </p>
        </div>
      </div>
    </GameModal>
  );
}
