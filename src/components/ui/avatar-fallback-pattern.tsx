import { generateAvatarGradient, generateAvatarPattern, getAvatarInitial, type AvatarPattern } from "@/lib/avatar";
import { cn } from "@/lib/utils";

interface AvatarFallbackProps {
  seed: string;
  name?: string | null;
  wallet?: string | null;
  className?: string;
  textClassName?: string;
}

function PatternSvg({ pattern, opacity }: { pattern: AvatarPattern; opacity: number }) {
  const fill = `rgba(255,255,255,${opacity})`;
  const stroke = `rgba(255,255,255,${opacity})`;

  switch (pattern) {
    case 'circle':
      return (
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
          <circle cx="70" cy="30" r="28" fill={fill} />
        </svg>
      );
    case 'diamond':
      return (
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
          <rect x="50" y="-10" width="40" height="40" rx="4" transform="rotate(45 50 50)" fill={fill} />
        </svg>
      );
    case 'cross':
      return (
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
          <line x1="15" y1="15" x2="85" y2="85" stroke={stroke} strokeWidth="6" strokeLinecap="round" />
          <line x1="85" y1="15" x2="15" y2="85" stroke={stroke} strokeWidth="6" strokeLinecap="round" />
        </svg>
      );
    case 'dots':
      return (
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
          {[20, 50, 80].map(cx =>
            [20, 50, 80].map(cy => (
              <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="5" fill={fill} />
            ))
          )}
        </svg>
      );
    case 'diagonal-lines':
      return (
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
          {[-20, 0, 20, 40, 60, 80, 100].map(offset => (
            <line
              key={offset}
              x1={offset}
              y1="0"
              x2={offset + 40}
              y2="100"
              stroke={stroke}
              strokeWidth="4"
            />
          ))}
        </svg>
      );
    case 'corner-squares':
      return (
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
          <rect x="5" y="5" width="18" height="18" rx="3" fill={fill} />
          <rect x="77" y="5" width="18" height="18" rx="3" fill={fill} />
          <rect x="5" y="77" width="18" height="18" rx="3" fill={fill} />
          <rect x="77" y="77" width="18" height="18" rx="3" fill={fill} />
        </svg>
      );
  }
}

export function AvatarFallback({ seed, name, wallet, className, textClassName }: AvatarFallbackProps) {
  const gradient = generateAvatarGradient(seed);
  const { pattern, opacity } = generateAvatarPattern(seed);
  const initial = getAvatarInitial(name, wallet);

  return (
    <div
      className={cn(
        "relative overflow-hidden flex items-center justify-center rounded-full",
        className
      )}
      style={{ background: gradient }}
    >
      <PatternSvg pattern={pattern} opacity={opacity} />
      <span className={cn("relative z-10 text-white font-bold select-none", textClassName)}>
        {initial}
      </span>
    </div>
  );
}
