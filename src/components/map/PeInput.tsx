import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PEIcon } from '@/components/ui/pe-icon';

interface PeInputProps {
  value: number;
  onChange: (value: number) => void;
  pixelCount: number;
  availablePe?: number;
  label?: string;
}

export function PeInput({ value, onChange, pixelCount, availablePe, label = 'per pixel' }: PeInputProps) {
  const isInsufficient = availablePe !== undefined && (value * pixelCount) > availablePe;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor="pe-input" className="text-xs text-muted-foreground flex items-center gap-1">
          <PEIcon size="xs" />
          {label}
        </Label>
        {availablePe !== undefined && (
          <span className="text-xs text-muted-foreground tabular-nums">
            avail {availablePe.toLocaleString()}
          </span>
        )}
      </div>
      <Input
        id="pe-input"
        type="number"
        min={1}
        value={value}
        onChange={(e) => onChange(Math.max(1, parseInt(e.target.value) || 1))}
        className="h-8 text-sm tabular-nums"
      />
      {isInsufficient && (
        <div className="text-[10px] text-destructive">Insufficient PE</div>
      )}
    </div>
  );
}
