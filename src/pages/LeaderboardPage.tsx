import { Trophy } from "lucide-react";

const LeaderboardPage = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-muted/30">
      <div className="flex flex-col items-center gap-4 text-center p-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Trophy className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground">
          Leaderboard
        </h1>
        <p className="text-muted-foreground max-w-md">
          Top pixel owners, biggest stakers, and most conquered territory.
          Coming soon!
        </p>
        <div className="mt-4 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm">
          Phase 8: Polish & Launch
        </div>
      </div>
    </div>
  );
};

export default LeaderboardPage;
