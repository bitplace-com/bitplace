import { cn } from "@/lib/utils";

interface BitplaceLogoProps {
  className?: string;
}

export function BitplaceLogo({ className }: BitplaceLogoProps) {
  return (
    <svg
      viewBox="0 0 300 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("w-full h-full", className)}
    >
      <path
        d="M150.004 0C122.668 0 97.0595 7.30141 75.0054 20.0699C30.1549 46.0281 0 94.4972 0 150.004C0 177.311 7.30141 202.948 20.0699 225.002C45.9996 269.817 94.4615 300 149.996 300H224.995V225.002H74.9982V74.9982H225.002V224.995C264.471 224.995 296.831 194.49 299.779 155.792C299.807 155.378 299.843 154.957 299.843 154.571C299.872 154.186 299.907 153.801 299.907 153.422C299.971 152.266 300 151.153 300 149.996V74.9982V0H150.004Z"
        fill="currentColor"
      />
      <rect x="118" y="110" width="20" height="40" fill="currentColor" />
      <rect x="163" y="110" width="20" height="40" fill="currentColor" />
    </svg>
  );
}
