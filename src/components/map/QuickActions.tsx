import { useState } from 'react';
import { Search, Trophy } from 'lucide-react';
import { GlassIconButton } from '@/components/ui/glass-icon-button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { SearchModal } from '@/components/modals/SearchModal';
import { LeaderboardModal } from '@/components/modals/LeaderboardModal';

export function QuickActions() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <GlassIconButton
              onClick={() => setSearchOpen(true)}
              aria-label="Search location"
            >
              <Search className="h-4 w-4" />
            </GlassIconButton>
          </TooltipTrigger>
          <TooltipContent side="left">Search location</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <GlassIconButton
              onClick={() => setLeaderboardOpen(true)}
              aria-label="Leaderboard"
            >
              <Trophy className="h-4 w-4" />
            </GlassIconButton>
          </TooltipTrigger>
          <TooltipContent side="left">Leaderboard</TooltipContent>
        </Tooltip>
      </div>

      <SearchModal open={searchOpen} onOpenChange={setSearchOpen} />
      <LeaderboardModal open={leaderboardOpen} onOpenChange={setLeaderboardOpen} />
    </>
  );
}
