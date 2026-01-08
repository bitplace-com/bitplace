import { useState, ReactNode } from "react";
import {
  Map,
  Book,
  Trophy,
  Users,
  Search,
  Coins,
  Bell,
  Settings,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { RulesModal } from "@/components/modals/RulesModal";
import { LeaderboardModal } from "@/components/modals/LeaderboardModal";
import { AllianceModal } from "@/components/modals/AllianceModal";
import { SearchModal } from "@/components/modals/SearchModal";
import { ShopModal } from "@/components/modals/ShopModal";
import { NotificationsModal } from "@/components/modals/NotificationsModal";
import { SettingsModal } from "@/components/modals/SettingsModal";

type ModalType = "rules" | "leaderboard" | "alliance" | "search" | "shop" | "notifications" | "settings" | null;

interface IconRailButtonProps {
  icon: ReactNode;
  tooltip: string;
  onClick?: () => void;
  active?: boolean;
}

function IconRailButton({ icon, tooltip, onClick, active }: IconRailButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            "h-10 w-10 flex items-center justify-center rounded-xl",
            "glass-hud transition-all duration-200",
            "hover:scale-105 hover:brightness-110",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            active && "ring-2 ring-primary/50 bg-primary/10"
          )}
        >
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

export function IconRail() {
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  const openModal = (modal: ModalType) => setActiveModal(modal);
  const closeModal = () => setActiveModal(null);

  return (
    <>
      {/* Icon Rail */}
      <div className="fixed left-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2">
        {/* Map / Home */}
        <IconRailButton
          icon={<Map className="h-5 w-5" />}
          tooltip="Map"
          active
        />

        {/* Separator */}
        <div className="h-px w-6 mx-auto bg-border/50 my-1" />

        {/* Main menu items */}
        <IconRailButton
          icon={<Book className="h-5 w-5" />}
          tooltip="Rules"
          onClick={() => openModal("rules")}
        />
        <IconRailButton
          icon={<Trophy className="h-5 w-5" />}
          tooltip="Leaderboard"
          onClick={() => openModal("leaderboard")}
        />
        <IconRailButton
          icon={<Users className="h-5 w-5" />}
          tooltip="Alliance"
          onClick={() => openModal("alliance")}
        />
        <IconRailButton
          icon={<Search className="h-5 w-5" />}
          tooltip="Search"
          onClick={() => openModal("search")}
        />
        <IconRailButton
          icon={<Coins className="h-5 w-5" />}
          tooltip="Shop"
          onClick={() => openModal("shop")}
        />
        <IconRailButton
          icon={<Bell className="h-5 w-5" />}
          tooltip="Notifications"
          onClick={() => openModal("notifications")}
        />

        {/* Separator */}
        <div className="h-px w-6 mx-auto bg-border/50 my-1" />

        {/* Settings at bottom */}
        <IconRailButton
          icon={<Settings className="h-5 w-5" />}
          tooltip="Settings"
          onClick={() => openModal("settings")}
        />
      </div>

      {/* Modals */}
      <RulesModal open={activeModal === "rules"} onOpenChange={(open) => !open && closeModal()} />
      <LeaderboardModal open={activeModal === "leaderboard"} onOpenChange={(open) => !open && closeModal()} />
      <AllianceModal open={activeModal === "alliance"} onOpenChange={(open) => !open && closeModal()} />
      <SearchModal open={activeModal === "search"} onOpenChange={(open) => !open && closeModal()} />
      <ShopModal open={activeModal === "shop"} onOpenChange={(open) => !open && closeModal()} />
      <NotificationsModal open={activeModal === "notifications"} onOpenChange={(open) => !open && closeModal()} />
      <SettingsModal open={activeModal === "settings"} onOpenChange={(open) => !open && closeModal()} />
    </>
  );
}
