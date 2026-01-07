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
    // Compact icon-only version for collapsed sidebar - just icons, no wrapper button
    return (
      <>
        {isDark ? (
          <Sun className="h-4 w-4 shrink-0" />
        ) : (
          <Moon className="h-4 w-4 shrink-0" />
        )}
        <span data-theme-toggle className="hidden" onClick={toggleTheme} />
      </>
    );
  }

  // Full toggle with labels
  return (
    <>
      {isDark ? (
        <>
          <Sun className="h-4 w-4 shrink-0" />
          <span className="text-sm">Day Mode</span>
        </>
      ) : (
        <>
          <Moon className="h-4 w-4 shrink-0" />
          <span className="text-sm">Night Mode</span>
        </>
      )}
      <span data-theme-toggle className="hidden" onClick={toggleTheme} />
    </>
  );
}
