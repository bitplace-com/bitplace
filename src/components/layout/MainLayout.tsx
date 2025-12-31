import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { WalletButton } from "@/components/wallet/WalletButton";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <header className="h-14 flex items-center justify-between border-b border-border/50 px-4 bg-background/80 backdrop-blur-sm">
            <SidebarTrigger className="h-8 w-8 rounded-lg hover:bg-muted" />
            <WalletButton />
          </header>
          <div className="flex-1">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
