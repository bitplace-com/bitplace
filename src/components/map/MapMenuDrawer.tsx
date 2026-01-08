import { useState } from "react";
import { Menu, Map, Book, User } from "lucide-react";
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

const navItems = [
  { path: "/", label: "Map", icon: Map },
  { path: "/rules", label: "Rules", icon: Book },
  { path: "/profile", label: "Profile", icon: User },
];

export function MapMenuDrawer() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigate = (path: string) => {
    navigate(path);
    setOpen(false);
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
        className="w-72"
      >
        <SheetHeader className="text-left">
          <SheetTitle className="text-lg font-semibold text-foreground">
            Bitplace
          </SheetTitle>
        </SheetHeader>
        <nav className="mt-6 space-y-1">
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
      </SheetContent>
    </Sheet>
  );
}
