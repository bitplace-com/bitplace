import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { MainLayout } from "@/components/layout/MainLayout";
import { MapLayout } from "@/components/layout/MapLayout";
import { WalletProvider } from "@/contexts/WalletContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useEdgeFunctionWarmup } from "@/hooks/useEdgeFunctionWarmup";
import MapPage from "./pages/MapPage";
import RulesPage from "./pages/RulesPage";
import SpecPage from "./pages/SpecPage";
import ProfilePage from "./pages/ProfilePage";
import LeaderboardPage from "./pages/LeaderboardPage";
import WalletCallbackPage from "./pages/WalletCallbackPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Component to initialize warmup
function AppInitializer({ children }: { children: React.ReactNode }) {
  useEdgeFunctionWarmup();
  return <>{children}</>;
}

const App = () => (
  <ThemeProvider
    attribute="class"
    defaultTheme="light"
    storageKey="bitplace_theme"
    enableSystem={false}
  >
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WalletProvider>
          <AppInitializer>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Map route with collapsible sidebar */}
                <Route path="/" element={<ErrorBoundary><MapLayout><MapPage /></MapLayout></ErrorBoundary>} />
                {/* Wallet callback for mobile deeplink returns */}
                <Route path="/wallet-callback" element={<WalletCallbackPage />} />
                {/* Other routes use MainLayout with sidebar */}
                <Route element={<MainLayout><RulesPage /></MainLayout>} path="/rules" />
                <Route element={<MainLayout><SpecPage /></MainLayout>} path="/spec" />
                <Route element={<MainLayout><ProfilePage /></MainLayout>} path="/profile" />
                <Route element={<MainLayout><LeaderboardPage /></MainLayout>} path="/leaderboard" />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </AppInitializer>
        </WalletProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
