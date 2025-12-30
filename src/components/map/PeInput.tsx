import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PeInputProps {
  value: number;
  onChange: (value: number) => void;
  pixelCount: number;
  availablePe?: number;
  label?: string;
}

export function PeInput({ value, onChange, pixelCount, availablePe, label = 'PE per pixel' }: PeInputProps) {
  const total = value * pixelCount;
  const isInsufficient = availablePe !== undefined && total > availablePe;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="pe-input" className="text-xs text-muted-foreground">
          {label}
        </Label>
        {availablePe !== undefined && (
          <span className="text-xs text-muted-foreground">
            Available: {availablePe.toLocaleString()} PE
          </span>
        )}
      </div>
      <Input
        id="pe-input"
        type="number"
        min={1}
        value={value}
        onChange={(e) => onChange(Math.max(1, parseInt(e.target.value) || 1))}
        className="h-8 text-sm"
      />
      <div className={`text-xs ${isInsufficient ? 'text-destructive' : 'text-muted-foreground'}`}>
        Total: {total.toLocaleString()} PE × {pixelCount} pixel{pixelCount > 1 ? 's' : ''}
        {isInsufficient && ' (insufficient)'}
      </div>
    </div>
  );
}
