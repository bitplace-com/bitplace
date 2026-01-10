import { Grid3X3, User, Users } from 'lucide-react';
import { PEIcon } from '@/components/ui/pe-icon';
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
