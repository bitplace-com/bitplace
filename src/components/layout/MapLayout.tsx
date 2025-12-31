import { SidebarProvider } from "@/components/ui/sidebar";
import { MapSidebar } from "./MapSidebar";

interface MapLayoutProps {
  children: React.ReactNode;
}

export function MapLayout({ children }: MapLayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <MapSidebar />
        <main className="flex-1 relative overflow-hidden">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
