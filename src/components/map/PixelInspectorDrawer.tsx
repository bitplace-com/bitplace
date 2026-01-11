import { Component, ReactNode } from 'react';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { PixelInfoPanel } from './PixelInfoPanel';
import { GlassPanel } from '@/components/ui/glass-panel';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { X, RefreshCw } from 'lucide-react';

interface PixelInspectorDrawerProps {
  pixel: { x: number; y: number } | null;
  onClose: () => void;
  currentUserId?: string;
  actionSelectionCount?: number;
}

// Local error boundary for inspector panel
interface ErrorBoundaryState {
  hasError: boolean;
}

class InspectorErrorBoundary extends Component<
  { children: ReactNode; onClose: () => void; x: number; y: number },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; onClose: () => void; x: number; y: number }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('PixelInspector error:', error);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <GlassPanel className="w-80 max-w-[calc(100vw-2rem)]" padding="none">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/50">
            <span className="text-sm font-medium text-foreground">
              Pixel: {this.props.x.toLocaleString()}, {this.props.y.toLocaleString()}
            </span>
            <button
              onClick={this.props.onClose}
              className="p-1 rounded hover:bg-muted/50 transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <div className="px-3 py-6 flex flex-col items-center gap-3">
            <p className="text-sm text-muted-foreground">Something went wrong</p>
            <Button size="sm" variant="outline" onClick={this.handleRetry}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Retry
            </Button>
          </div>
        </GlassPanel>
      );
    }

    return this.props.children;
  }
}

export function PixelInspectorDrawer({
  pixel,
  onClose,
  currentUserId,
  actionSelectionCount = 0,
}: PixelInspectorDrawerProps) {
  const isMobile = useIsMobile();

  if (!pixel) return null;

  const infoPanel = (
    <InspectorErrorBoundary onClose={onClose} x={pixel.x} y={pixel.y}>
      <PixelInfoPanel
        x={pixel.x}
        y={pixel.y}
        onClose={onClose}
        currentUserId={currentUserId}
        actionSelectionCount={actionSelectionCount}
      />
    </InspectorErrorBoundary>
  );

  if (isMobile) {
    return (
      <Drawer open={!!pixel} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="px-4">
          <div className="pt-2 pb-4">{infoPanel}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: Floating card at bottom-left
  return (
    <div className="fixed bottom-20 left-4 z-50 animate-in slide-in-from-bottom-4 fade-in duration-200">
      {infoPanel}
    </div>
  );
}
