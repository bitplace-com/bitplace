import { useState } from "react";
import { PixelIcon } from "@/components/icons";
import { useTheme } from "next-themes";
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
import { AllianceModal } from "@/components/modals/AllianceModal";
import { SettingsModal } from "@/components/modals/SettingsModal";
import { LeaderboardModal } from "@/components/modals/LeaderboardModal";

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
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
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
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <GlassIconButton size="lg" aria-label="Open menu">
            <PixelIcon name="menu" size="md" />
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
          <nav className="mt-6 space-y-4 flex-1">
            {/* HOME section */}
            <div>
              <p className="px-3 mb-2 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Home
              </p>
              <div className="space-y-1">
                {/* Map */}
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

                {/* Buy $BIT (was Shop) */}
                <Button
                  variant="ghost"
                  onClick={() => setShopOpen(true)}
                  className="w-full justify-start gap-3 h-11 rounded-xl text-foreground/80 hover:text-foreground hover:bg-foreground/8"
                >
                  <PixelIcon name="cart" size="md" />
                  Buy $BIT
                </Button>
              </div>
            </div>

            {/* BASICS section */}
            <div>
              <p className="px-3 mb-2 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Basics
              </p>
              <div className="space-y-1">
                {/* Leaderboard */}
                <Button
                  variant="ghost"
                  onClick={() => setLeaderboardOpen(true)}
                  className="w-full justify-start gap-3 h-11 rounded-xl text-foreground/80 hover:text-foreground hover:bg-foreground/8"
                >
                  <PixelIcon name="trophy" size="md" />
                  Leaderboard
                </Button>

                {/* Alliance */}
                <Button
                  variant="ghost"
                  onClick={() => setAllianceOpen(true)}
                  className="w-full justify-start gap-3 h-11 rounded-xl text-foreground/80 hover:text-foreground hover:bg-foreground/8"
                >
                  <PixelIcon name="users" size="md" />
                  Alliance
                </Button>

                {/* Rules */}
                <Button
                  variant="ghost"
                  onClick={() => setRulesOpen(true)}
                  className="w-full justify-start gap-3 h-11 rounded-xl text-foreground/80 hover:text-foreground hover:bg-foreground/8"
                >
                  <PixelIcon name="book" size="md" />
                  Rules
                </Button>
              </div>
            </div>
          </nav>

          {/* Footer with Settings and Theme */}
          <div className="flex flex-col gap-1 mt-auto pt-4 border-t border-border/30">
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
        </SheetContent>
      </Sheet>

      <RulesModal open={rulesOpen} onOpenChange={setRulesOpen} />
      <ShopModal open={shopOpen} onOpenChange={setShopOpen} />
      <AllianceModal open={allianceOpen} onOpenChange={setAllianceOpen} />
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
      <LeaderboardModal open={leaderboardOpen} onOpenChange={setLeaderboardOpen} />
    </>
  );
}
