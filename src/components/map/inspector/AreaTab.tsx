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
    <div className="space-y-4">
      {/* Total Selected */}
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <Grid3X3 className="h-4 w-4" />
          <span className="text-sm">Selected</span>
        </div>
        <div className="text-3xl font-bold">
          {pixelCount.toLocaleString()}
          <span className="text-sm font-normal text-muted-foreground ml-2">pixels</span>
        </div>
      </div>

      {/* Breakdown */}
      {breakdown && (
        <div className="grid grid-cols-3 gap-2">
          <BreakdownCard
            icon={<div className="h-3 w-3 rounded-full bg-muted-foreground/30" />}
            label="Empty"
            value={breakdown.empty}
          />
          <BreakdownCard
            icon={<User className="h-3 w-3 text-primary" />}
            label="Yours"
            value={breakdown.ownedByUser}
          />
          <BreakdownCard
            icon={<Users className="h-3 w-3 text-muted-foreground" />}
            label="Others"
            value={breakdown.ownedByOthers}
          />
        </div>
      )}

      {/* Required PE */}
      {validationResult && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
          <div className="flex items-center gap-2 text-primary mb-1">
            <Coins className="h-4 w-4" />
            <span className="text-sm">Total PE Required</span>
          </div>
          <div className="text-2xl font-bold text-primary">
            {validationResult.requiredPeTotal.toLocaleString()}
            <span className="text-sm font-normal ml-1">PE</span>
          </div>
          {!validationResult.ok && (
            <div className="text-xs text-destructive mt-2">
              {validationResult.invalidPixels.length} pixel(s) have issues
            </div>
          )}
        </div>
      )}

      {/* No validation yet */}
      {!validationResult && (
        <div className="text-center text-muted-foreground py-4 text-sm">
          Click "Validate" to see PE requirements
        </div>
      )}
    </div>
  );
}

interface BreakdownCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
}

function BreakdownCard({ icon, label, value }: BreakdownCardProps) {
  return (
    <div className="bg-muted/50 rounded-lg p-2 text-center">
      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
