import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { PixelInspectorCard } from './PixelInspectorCard';
import { useIsMobile } from '@/hooks/use-mobile';
import type { GameMode } from '@/hooks/useGameActions';

interface PixelInspectorDrawerProps {
  pixel: { x: number; y: number } | null;
  onClose: () => void;
  onPaint: (x: number, y: number) => void;
  onDefendAttack: (x: number, y: number, mode: 'DEFEND' | 'ATTACK') => void;
  selectedColor: string;
  mode: GameMode;
  currentUserId?: string;
}

export function PixelInspectorDrawer({
  pixel,
  onClose,
  onPaint,
  onDefendAttack,
  selectedColor,
  mode,
  currentUserId,
}: PixelInspectorDrawerProps) {
  const isMobile = useIsMobile();

  if (!pixel) return null;

  if (isMobile) {
    return (
      <Drawer open={!!pixel} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="px-4 pb-6">
          <div className="pt-2">
            <PixelInspectorCard
              x={pixel.x}
              y={pixel.y}
              onClose={onClose}
              onPaint={onPaint}
              onDefendAttack={onDefendAttack}
              selectedColor={selectedColor}
              mode={mode}
              currentUserId={currentUserId}
            />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: Floating card at bottom-left
  return (
    <div className="fixed bottom-20 left-4 z-50 animate-in slide-in-from-bottom-4 fade-in duration-200">
      <PixelInspectorCard
        x={pixel.x}
        y={pixel.y}
        onClose={onClose}
        onPaint={onPaint}
        onDefendAttack={onDefendAttack}
        selectedColor={selectedColor}
        mode={mode}
        currentUserId={currentUserId}
      />
    </div>
  );
}
