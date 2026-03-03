import { useState } from "react";
import { PixelIcon } from "@/components/icons";
import { useTheme } from "next-themes";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GlassIconButton } from "@/components/ui/glass-icon-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RulesModal } from "@/components/modals/RulesModal";
import { ShopModal } from "@/components/modals/ShopModal";
import { AllianceModal } from "@/components/modals/AllianceModal";
import { SettingsModal } from "@/components/modals/SettingsModal";
import { WhitePaperModal } from "@/components/modals/WhitePaperModal";

function ThemeToggleButton() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <Button
      variant="ghost"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="w-full justify-start gap-3 h-11 rounded-xl text-foreground/80 hover:text-foreground hover:bg-foreground/8"
    >
      <PixelIcon name={isDark ? "sun" : "moon"} size="md" />
      {isDark ? "Day Mode" : "Night Mode"}
    </Button>
  );
}

export function MapMenuDrawer() {
  const [open, setOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [allianceOpen, setAllianceOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [whitePaperOpen, setWhitePaperOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigateToMap = () => {
    if (location.pathname !== "/") {
      navigate("/");
    }
    setOpen(false);
  };

  return (
    <>
      <GlassIconButton size="lg" aria-label="Open menu" data-tour="menu" onClick={() => setOpen(true)}>
        <PixelIcon name="menu" size="md" />
      </GlassIconButton>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={cn(
            "max-w-xs w-full p-0 gap-0 rounded-2xl",
            "glass-hud-strong border border-hud-border shadow-2xl",
            "bg-background/95 backdrop-blur-xl"
          )}
        >
          <DialogHeader className="px-5 pt-5 pb-3 text-left">
            <DialogTitle className="text-lg font-semibold text-foreground">
              Bitplace
            </DialogTitle>
          </DialogHeader>

          <nav className="px-3 pb-3 space-y-4">
            {/* HOME section */}
            <div>
              <p className="px-3 mb-2 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Home
              </p>
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  onClick={handleNavigateToMap}
                  className={cn(
                    "w-full justify-start gap-3 h-11 rounded-xl text-foreground/80 hover:text-foreground hover:bg-foreground/8",
                    location.pathname === "/" && "bg-foreground/10 text-foreground font-medium hover:bg-foreground/15"
                  )}
                >
                  <PixelIcon name="globe" size="md" />
                  Map
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => setAllianceOpen(true)}
                  className="w-full justify-start gap-3 h-11 rounded-xl text-foreground/80 hover:text-foreground hover:bg-foreground/8"
                >
                  <PixelIcon name="usersCrown" size="md" />
                  Alliance
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => setShopOpen(true)}
                  className="w-full justify-start gap-3 h-11 rounded-xl text-foreground/80 hover:text-foreground hover:bg-foreground/8"
                >
                  <PixelIcon name="cart" size="md" />
                  Get $BIT
                </Button>
              </div>
            </div>

            {/* BASICS section */}
            <div>
              <p className="px-3 mb-2 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Basics
              </p>
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  onClick={() => setWhitePaperOpen(true)}
                  className="w-full justify-start gap-3 h-11 rounded-xl text-foreground/80 hover:text-foreground hover:bg-foreground/8"
                >
                  <PixelIcon name="book" size="md" />
                  How It Works
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => setRulesOpen(true)}
                  className="w-full justify-start gap-3 h-11 rounded-xl text-foreground/80 hover:text-foreground hover:bg-foreground/8"
                >
                  <PixelIcon name="info" size="md" />
                  Rules
                </Button>
              </div>
            </div>
          </nav>

          {/* Footer */}
          <div className="flex flex-col gap-1 px-3 pb-4 pt-3 border-t border-border/30">
            <Button
              variant="ghost"
              onClick={() => setSettingsOpen(true)}
              className="w-full justify-start gap-3 h-11 rounded-xl text-foreground/80 hover:text-foreground hover:bg-foreground/8"
            >
              <PixelIcon name="settings" size="md" />
              Settings
            </Button>
            <ThemeToggleButton />
          </div>
        </DialogContent>
      </Dialog>

      <RulesModal open={rulesOpen} onOpenChange={setRulesOpen} />
      <ShopModal open={shopOpen} onOpenChange={setShopOpen} />
      <AllianceModal open={allianceOpen} onOpenChange={setAllianceOpen} />
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
      <WhitePaperModal open={whitePaperOpen} onOpenChange={setWhitePaperOpen} />
    </>
  );
}
