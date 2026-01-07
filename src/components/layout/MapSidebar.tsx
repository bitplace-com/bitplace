import { useState } from "react";
import { Map, FileText, User, Trophy, Users, Search, ShoppingBag } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { AllianceModal } from "@/components/modals/AllianceModal";
import { SearchModal } from "@/components/modals/SearchModal";
import { ShopModal } from "@/components/modals/ShopModal";
import { RulesModal } from "@/components/modals/RulesModal";
import { LeaderboardModal } from "@/components/modals/LeaderboardModal";
import { ProfileModal } from "@/components/modals/ProfileModal";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const modalItems = [
  { title: "Rules", icon: FileText, action: "rules" as const },
  { title: "Profile", icon: User, action: "profile" as const },
  { title: "Leaderboard", icon: Trophy, action: "leaderboard" as const },
];

const utilityItems = [
  { title: "Alliance", icon: Users, action: "alliance" as const },
  { title: "Search", icon: Search, action: "search" as const },
  { title: "Shop", icon: ShoppingBag, action: "shop" as const },
];

type ModalType = "alliance" | "search" | "shop" | "rules" | "leaderboard" | "profile" | null;

export function MapSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  const handleOpenModal = (modal: ModalType) => {
    setActiveModal(modal);
  };

  const handleCloseModal = () => {
    setActiveModal(null);
  };

  return (
    <>
      <Sidebar collapsible="icon" className="border-r border-border">
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-md">
              B
            </div>
            {!isCollapsed && (
              <span className="font-bold text-foreground tracking-tight text-lg">
                Bitplace
              </span>
            )}
          </div>
        </SidebarHeader>

        <SidebarContent className="px-2">
          {/* Navigation Group */}
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {/* Map link - only one that navigates */}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip="Map"
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-foreground/70 transition-all hover:bg-accent hover:text-foreground cursor-pointer bg-primary/10 text-foreground font-medium"
                  >
                    <Map className="h-4 w-4 shrink-0" />
                    {!isCollapsed && <span className="text-sm">Map</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                {/* Modal items */}
                {modalItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      tooltip={item.title}
                      onClick={() => handleOpenModal(item.action)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-foreground/70 transition-all hover:bg-accent hover:text-foreground cursor-pointer"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!isCollapsed && <span className="text-sm">{item.title}</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator className="my-2" />

          {/* Utilities Group */}
          <SidebarGroup>
            {!isCollapsed && (
              <SidebarGroupLabel className="text-xs text-muted-foreground px-3 mb-1">
                Utilities
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {utilityItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      tooltip={item.title}
                      onClick={() => handleOpenModal(item.action)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-foreground/70 transition-all hover:bg-accent hover:text-foreground cursor-pointer"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!isCollapsed && <span className="text-sm">{item.title}</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Theme"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-foreground/70 transition-all hover:bg-accent hover:text-foreground cursor-pointer"
                onClick={() => {
                  const themeToggle = document.querySelector('[data-theme-toggle]') as HTMLButtonElement;
                  themeToggle?.click();
                }}
              >
                <ThemeToggle collapsed={isCollapsed} />
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      {/* Modals */}
      <AllianceModal open={activeModal === "alliance"} onOpenChange={(open) => !open && handleCloseModal()} />
      <SearchModal open={activeModal === "search"} onOpenChange={(open) => !open && handleCloseModal()} />
      <ShopModal open={activeModal === "shop"} onOpenChange={(open) => !open && handleCloseModal()} />
      <RulesModal open={activeModal === "rules"} onOpenChange={(open) => !open && handleCloseModal()} />
      <LeaderboardModal open={activeModal === "leaderboard"} onOpenChange={(open) => !open && handleCloseModal()} />
      <ProfileModal open={activeModal === "profile"} onOpenChange={(open) => !open && handleCloseModal()} />
    </>
  );
}
