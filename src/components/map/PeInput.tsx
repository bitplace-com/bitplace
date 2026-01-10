import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PEIcon } from '@/components/ui/pe-icon';
import { cn } from '@/lib/utils';

interface PeInputProps {
  value: number;
  onChange: (value: number) => void;
  pixelCount: number;
  label?: string;
}

const PE_PRESETS = [1, 2, 5, 10];

export function PeInput({ value, onChange, pixelCount, label = 'per pixel' }: PeInputProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor="pe-input" className="text-xs text-muted-foreground flex items-center gap-1">
        <PEIcon size="xs" />
        {label}
      </Label>
      <Input
        id="pe-input"
        type="number"
        min={1}
        value={value}
        onChange={(e) => onChange(Math.max(1, parseInt(e.target.value) || 1))}
        className="h-8 text-sm tabular-nums"
      />
      {/* Quick presets */}
      <div className="flex gap-1">
        {PE_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onChange(preset)}
            className={cn(
              "flex-1 h-6 text-[10px] rounded border transition-colors",
              value === preset 
                ? "bg-primary text-primary-foreground border-primary" 
                : "bg-muted/50 border-border hover:bg-muted"
            )}
          >
            {preset}
          </button>
        ))}
      </div>
    </div>
  );
}
