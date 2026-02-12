import { Map, FileText, User } from "lucide-react";
import { PixelIcon } from "@/components/icons";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const navItems = [
  { title: "Map", url: "/", icon: Map, pixelIcon: undefined as string | undefined },
  { title: "Rules", url: "/rules", icon: FileText, pixelIcon: undefined as string | undefined },
  { title: "Profile", url: "/profile", icon: User, pixelIcon: undefined as string | undefined },
  { title: "Leaderboard", url: "/leaderboard", icon: undefined as any, pixelIcon: "trophy" as string | undefined },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
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
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-foreground/70 transition-all hover:bg-accent hover:text-foreground"
                      activeClassName="bg-primary/10 text-foreground font-medium hover:bg-primary/15"
                    >
                      {item.icon ? <item.icon className="h-4 w-4 shrink-0" /> : item.pixelIcon ? <PixelIcon name={item.pixelIcon as any} className="h-4 w-4 shrink-0" /> : null}
                      {!isCollapsed && <span className="text-sm">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-2 pb-4">
        <div className={isCollapsed ? "flex justify-center" : "px-1"}>
          <ThemeToggle collapsed={isCollapsed} />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
