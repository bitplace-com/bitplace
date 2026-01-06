import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  collapsed?: boolean;
}

export function ThemeToggle({ collapsed = false }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  if (collapsed) {
    // Compact icon-only version for collapsed sidebar
    return (
      <button
        onClick={toggleTheme}
        className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-accent text-muted-foreground hover:text-foreground"
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {isDark ? (
          <Sun className="h-4 w-4" />
        ) : (
          <Moon className="h-4 w-4" />
        )}
      </button>
    );
  }

  // Full toggle with labels
  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-2 px-3 py-2 w-full rounded-lg text-sm transition-colors hover:bg-accent text-muted-foreground hover:text-foreground"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <>
          <Sun className="h-4 w-4" />
          <span>Day Mode</span>
        </>
      ) : (
        <>
          <Moon className="h-4 w-4" />
          <span>Night Mode</span>
        </>
      )}
    </button>
  );
}
