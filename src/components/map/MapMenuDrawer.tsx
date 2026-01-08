import { useState } from "react";
import { Menu, Map, Book, User, Settings, Moon, Sun } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "next-themes";
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

const navItems = [
  { path: "/", label: "Map", icon: Map },
  { path: "/rules", label: "Rules", icon: Book },
  { path: "/profile", label: "Profile", icon: User },
];

export function MapMenuDrawer() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  const handleNavigate = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
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
          {navItems.map(({ path, label, icon: Icon }) => {
            const isActive = location.pathname === path;
            return (
              <Button
                key={path}
                variant="ghost"
                onClick={() => handleNavigate(path)}
                className={cn(
                  "w-full justify-start gap-3 h-11 rounded-xl text-foreground/80 hover:text-foreground hover:bg-white/8",
                  isActive && "bg-white/10 text-white font-medium hover:bg-white/15 hover:text-white"
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Button>
            );
          })}
        </nav>

        {/* Footer con Settings e Theme Toggle */}
        <div className="flex flex-col gap-1 mt-auto pt-4 border-t border-white/10">
          <Button
            variant="ghost"
            onClick={() => {/* placeholder per settings */}}
            className="w-full justify-start gap-3 h-11 rounded-xl text-foreground/80 hover:text-foreground hover:bg-white/8"
          >
            <Settings className="h-5 w-5" />
            Settings
          </Button>
          
          <Button
            variant="ghost"
            onClick={toggleTheme}
            className="w-full justify-start gap-3 h-11 rounded-xl text-foreground/80 hover:text-foreground hover:bg-white/8"
          >
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            {isDark ? "Day Mode" : "Night Mode"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
