import { Grid3X3, User, Users, Coins } from 'lucide-react';
import type { ValidateResult } from '@/hooks/useGameActions';

interface AreaTabProps {
  pixelCount: number;
  validationResult: ValidateResult | null;
  currentUserId?: string;
}

export function AreaTab({ pixelCount, validationResult, currentUserId }: AreaTabProps) {
  const breakdown = validationResult?.breakdown;

  return (
    <div className="space-y-3">
      {/* Total Selected - compact */}
      <div className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Grid3X3 className="h-3.5 w-3.5" />
          <span className="text-[11px] uppercase tracking-wider">Selected</span>
        </div>
        <div className="text-xl font-semibold">
          {pixelCount.toLocaleString()}
          <span className="text-[11px] font-normal text-muted-foreground ml-1">px</span>
        </div>
      </div>

      {/* Breakdown - compact chips */}
      {breakdown && (
        <div className="grid grid-cols-3 gap-1.5">
          <BreakdownChip
            icon={<div className="h-2 w-2 rounded-full bg-muted-foreground/30" />}
            label="Empty"
            value={breakdown.empty}
          />
          <BreakdownChip
            icon={<User className="h-2.5 w-2.5 text-primary" />}
            label="Yours"
            value={breakdown.ownedByUser}
          />
          <BreakdownChip
            icon={<Users className="h-2.5 w-2.5 text-muted-foreground" />}
            label="Others"
            value={breakdown.ownedByOthers}
          />
        </div>
      )}

      {/* Required PE - compact */}
      {validationResult && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-primary">
              <Coins className="h-3.5 w-3.5" />
              <span className="text-[11px] uppercase tracking-wider">PE Required</span>
            </div>
            <div className="text-lg font-semibold text-primary">
              {validationResult.requiredPeTotal.toLocaleString()}
            </div>
          </div>
          {!validationResult.ok && (
            <div className="text-[10px] text-destructive mt-1">
              {validationResult.invalidPixels.length} issue(s)
            </div>
          )}
        </div>
      )}

      {/* No validation yet */}
      {!validationResult && (
        <div className="text-center text-muted-foreground py-2 text-[11px]">
          Validate to see costs
        </div>
      )}
    </div>
  );
}

interface BreakdownChipProps {
  icon: React.ReactNode;
  label: string;
  value: number;
}

function BreakdownChip({ icon, label, value }: BreakdownChipProps) {
  return (
    <div className="bg-muted/40 rounded-md px-2 py-1.5 text-center">
      <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground mb-0.5">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}
