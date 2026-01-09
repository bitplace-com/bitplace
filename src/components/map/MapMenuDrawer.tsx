import { useState } from "react";
import { Menu, Map, Book, ShoppingBag, Settings, Bell, Users } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { GlassIconButton } from "@/components/ui/glass-icon-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RulesModal } from "@/components/modals/RulesModal";
import { ShopModal } from "@/components/modals/ShopModal";
import { NotificationsPanel } from "@/components/modals/NotificationsPanel";
import { AllianceModal } from "@/components/modals/AllianceModal";
import { SettingsModal } from "@/components/modals/SettingsModal";
import { useWallet } from "@/contexts/WalletContext";
import { useAllianceInvites } from "@/hooks/useAllianceInvites";

export function MapMenuDrawer() {
  const [open, setOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [allianceOpen, setAllianceOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  const { user } = useWallet();
  const { invites } = useAllianceInvites(user?.id);
  const notificationCount = invites.length;

  const handleNavigateToMap = () => {
    if (location.pathname !== "/") {
      navigate("/");
    }
    setOpen(false);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <GlassIconButton size="lg" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </GlassIconButton>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="w-72 flex flex-col"
          hideOverlay
        >
          <SheetHeader className="text-left">
            <SheetTitle className="text-lg font-semibold text-foreground">
              Bitplace
            </SheetTitle>
          </SheetHeader>
          <nav className="mt-6 space-y-1 flex-1">
            {/* Map */}
            <Button
              variant="ghost"
              onClick={handleNavigateToMap}
              className={cn(
                "w-full justify-start gap-3 h-11 rounded-xl text-foreground/80 hover:text-foreground hover:bg-foreground/8",
                location.pathname === "/" && "bg-foreground/10 text-foreground font-medium hover:bg-foreground/15"
              )}
            >
              <Map className="h-5 w-5" />
              Map
            </Button>

            {/* Notifications - with badge */}
            <Button
              variant="ghost"
              onClick={() => {
                setNotificationsOpen(true);
                setOpen(false);
              }}
              className="w-full justify-start gap-3 h-11 rounded-xl text-foreground/80 hover:text-foreground hover:bg-foreground/8 relative"
            >
              <Bell className="h-5 w-5" />
              Notifications
              {notificationCount > 0 && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center">
                  {notificationCount > 99 ? "99+" : notificationCount}
                </span>
              )}
            </Button>

            {/* Alliance - opens modal */}
            <Button
              variant="ghost"
              onClick={() => {
                setAllianceOpen(true);
                setOpen(false);
              }}
              className="w-full justify-start gap-3 h-11 rounded-xl text-foreground/80 hover:text-foreground hover:bg-foreground/8"
            >
              <Users className="h-5 w-5" />
              Alliance
            </Button>

            {/* Rules - opens modal */}
            <Button
              variant="ghost"
              onClick={() => {
                setRulesOpen(true);
                setOpen(false);
              }}
              className="w-full justify-start gap-3 h-11 rounded-xl text-foreground/80 hover:text-foreground hover:bg-foreground/8"
            >
              <Book className="h-5 w-5" />
              Rules
            </Button>

            {/* Shop - opens modal */}
            <Button
              variant="ghost"
              onClick={() => {
                setShopOpen(true);
                setOpen(false);
              }}
              className="w-full justify-start gap-3 h-11 rounded-xl text-foreground/80 hover:text-foreground hover:bg-foreground/8"
            >
              <ShoppingBag className="h-5 w-5" />
              Shop
            </Button>
          </nav>

          {/* Footer with Settings */}
          <div className="flex flex-col gap-1 mt-auto pt-4 border-t border-border/30">
            <Button
              variant="ghost"
              onClick={() => {
                setSettingsOpen(true);
                setOpen(false);
              }}
              className="w-full justify-start gap-3 h-11 rounded-xl text-foreground/80 hover:text-foreground hover:bg-foreground/8"
            >
              <Settings className="h-5 w-5" />
              Settings
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <RulesModal open={rulesOpen} onOpenChange={setRulesOpen} />
      <ShopModal open={shopOpen} onOpenChange={setShopOpen} />
      <NotificationsPanel open={notificationsOpen} onOpenChange={setNotificationsOpen} />
      <AllianceModal open={allianceOpen} onOpenChange={setAllianceOpen} />
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}