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
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { gridIntToLngLat } from "@/lib/pixelGrid";
import MapPage from "./pages/MapPage";
import RulesPage from "./pages/RulesPage";
import SpecPage from "./pages/SpecPage";
import ProfilePage from "./pages/ProfilePage";
import LeaderboardPage from "./pages/LeaderboardPage";
import WalletCallbackPage from "./pages/WalletCallbackPage";
import WhitePaperPage from "./pages/WhitePaperPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Redirect /profile/:id to /?player=:id
function ProfileRedirect() {
  const { id } = useParams();
  return <Navigate to={`/?player=${id}`} replace />;
}

// Redirect /p/X:Y to /?lat=...&lng=...&z=18&px=X&py=Y
function PixelRedirect() {
  const { coords } = useParams();
  const [searchParams] = useSearchParams();
  const player = searchParams.get('player');

  if (coords) {
    const parts = coords.split(':');
    const x = parseInt(parts[0], 10);
    const y = parseInt(parts[1], 10);
    if (!isNaN(x) && !isNaN(y)) {
      const { lat, lng } = gridIntToLngLat(x, y);
      let to = `/?lat=${lat.toFixed(5)}&lng=${lng.toFixed(5)}&z=18&px=${x}&py=${y}`;
      if (player) to += `&player=${player}`;
      return <Navigate to={to} replace />;
    }
  }
  return <Navigate to="/" replace />;
}

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
                <Route element={<MainLayout><WhitePaperPage /></MainLayout>} path="/whitepaper" />
                <Route element={<TermsPage />} path="/terms" />
                <Route element={<PrivacyPage />} path="/privacy" />
                <Route path="/p/:coords" element={<PixelRedirect />} />
                <Route path="/profile/:id" element={<ProfileRedirect />} />
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
