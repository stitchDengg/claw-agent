"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const themeOrder = ["light", "dark", "system"] as const;
const themeLabels: Record<string, string> = {
  light: "浅色模式",
  dark: "深色模式",
  system: "跟随系统",
};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
        <Monitor size={18} />
      </Button>
    );
  }

  const currentIndex = themeOrder.indexOf(
    theme as (typeof themeOrder)[number]
  );
  const nextTheme = themeOrder[(currentIndex + 1) % themeOrder.length];

  const icon =
    theme === "light" ? (
      <Sun size={18} />
    ) : theme === "dark" ? (
      <Moon size={18} />
    ) : (
      <Monitor size={18} />
    );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          onClick={() => setTheme(nextTheme)}
          className="inline-flex items-center justify-center h-9 w-9 shrink-0 rounded-lg hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
        >
          {icon}
        </TooltipTrigger>
        <TooltipContent>
          <p>{themeLabels[theme || "system"]}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
