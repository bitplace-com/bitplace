import { useState } from 'react';
import { PixelIcon } from '@/components/icons';
import { GlassIconButton } from '@/components/ui/glass-icon-button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { SearchModal } from '@/components/modals/SearchModal';
import { LeaderboardModal } from '@/components/modals/LeaderboardModal';

export function QuickActions() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);

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
      </div>

      <SearchModal open={searchOpen} onOpenChange={setSearchOpen} />
      <LeaderboardModal open={leaderboardOpen} onOpenChange={setLeaderboardOpen} />
    </>
  );
}
