import { Search } from "lucide-react";
import { GameModal } from "./GameModal";
import { Input } from "@/components/ui/input";

interface SearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchModal({ open, onOpenChange }: SearchModalProps) {
  return (
    <GameModal
      open={open}
      onOpenChange={onOpenChange}
      title="Search"
      description="Find coordinates, owners, or artwork"
      icon={<Search className="h-5 w-5" />}
    >
      <div className="space-y-4">
        <Input
          placeholder="Search by coordinates (x, y) or wallet..."
          className="bg-background/50 border-border/50"
        />
        <div className="text-center py-8 text-muted-foreground text-sm">
          <Search className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p>Search functionality coming soon</p>
        </div>
      </div>
    </GameModal>
  );
}
