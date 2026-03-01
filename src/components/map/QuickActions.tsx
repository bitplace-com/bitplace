import { useState } from 'react';
import { PixelIcon } from '@/components/icons';
import { GlassIconButton } from '@/components/ui/glass-icon-button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { SearchModal } from '@/components/modals/SearchModal';
import { LeaderboardModal } from '@/components/modals/LeaderboardModal';
import { PlacesModal } from '@/components/modals/PlacesModal';

interface QuickActionsProps {
  currentLat?: number;
  currentLng?: number;
  currentZoom?: number;
}

export function QuickActions({ currentLat = 0, currentLng = 0, currentZoom = 2 }: QuickActionsProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [placesOpen, setPlacesOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col gap-2" data-tour="quick-actions">
        <Tooltip>
          <TooltipTrigger asChild>
            <GlassIconButton
              onClick={() => setSearchOpen(true)}
              aria-label="Search location"
            >
              <PixelIcon name="globe" size="sm" />
            </GlassIconButton>
          </TooltipTrigger>
          <TooltipContent side="right">Search location</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <GlassIconButton
              onClick={() => setLeaderboardOpen(true)}
              aria-label="Leaderboard"
            >
              <PixelIcon name="trophy" size="sm" />
            </GlassIconButton>
          </TooltipTrigger>
          <TooltipContent side="right">Leaderboard</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <GlassIconButton
              onClick={() => setPlacesOpen(true)}
              aria-label="Pinned Locations"
            >
              <PixelIcon name="locationPin" size="sm" />
            </GlassIconButton>
          </TooltipTrigger>
          <TooltipContent side="right">Pinned Locations</TooltipContent>
        </Tooltip>
      </div>

      <SearchModal open={searchOpen} onOpenChange={setSearchOpen} />
      <LeaderboardModal open={leaderboardOpen} onOpenChange={setLeaderboardOpen} />
      <PlacesModal
        open={placesOpen}
        onOpenChange={setPlacesOpen}
        currentLat={currentLat}
        currentLng={currentLng}
        currentZoom={currentZoom}
      />
    </>
  );
}
