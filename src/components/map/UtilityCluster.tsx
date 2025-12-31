import { useState } from "react";
import { Book, Search, ShoppingBag, Users } from "lucide-react";
import { GlassIconButton } from "@/components/ui/glass-icon-button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { RulesModal } from "@/components/modals/RulesModal";
import { SearchModal } from "@/components/modals/SearchModal";
import { ShopModal } from "@/components/modals/ShopModal";
import { AllianceModal } from "@/components/modals/AllianceModal";

export function UtilityCluster() {
  const [rulesOpen, setRulesOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [allianceOpen, setAllianceOpen] = useState(false);

  return (
    <>
      <GlassPanel padding="sm" className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <GlassIconButton
              variant="ghost"
              size="sm"
              onClick={() => setRulesOpen(true)}
              aria-label="Game rules"
            >
              <Book className="h-4 w-4" />
            </GlassIconButton>
          </TooltipTrigger>
          <TooltipContent>Rules</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <GlassIconButton
              variant="ghost"
              size="sm"
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </GlassIconButton>
          </TooltipTrigger>
          <TooltipContent>Search</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <GlassIconButton
              variant="ghost"
              size="sm"
              onClick={() => setShopOpen(true)}
              aria-label="Shop"
            >
              <ShoppingBag className="h-4 w-4" />
            </GlassIconButton>
          </TooltipTrigger>
          <TooltipContent>Shop</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <GlassIconButton
              variant="ghost"
              size="sm"
              onClick={() => setAllianceOpen(true)}
              aria-label="Alliances"
            >
              <Users className="h-4 w-4" />
            </GlassIconButton>
          </TooltipTrigger>
          <TooltipContent>Alliances</TooltipContent>
        </Tooltip>
      </GlassPanel>

      <RulesModal open={rulesOpen} onOpenChange={setRulesOpen} />
      <SearchModal open={searchOpen} onOpenChange={setSearchOpen} />
      <ShopModal open={shopOpen} onOpenChange={setShopOpen} />
      <AllianceModal open={allianceOpen} onOpenChange={setAllianceOpen} />
    </>
  );
}
