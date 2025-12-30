import { Map } from "lucide-react";

const MapPage = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-muted/30">
      <div className="flex flex-col items-center gap-4 text-center p-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Map className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground">
          Bitplace Map
        </h1>
        <p className="text-muted-foreground max-w-md">
          MapLibre GL JS with pixel canvas overlay will be rendered here.
          Drag to select pixels, stake to defend or attack.
        </p>
        <div className="mt-4 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm">
          Phase 2: Map Integration
        </div>
      </div>
    </div>
  );
};

export default MapPage;
