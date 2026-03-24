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
      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-zinc-500">
        <Monitor size={16} />
      </Button>
    );
  }

  const currentIndex = themeOrder.indexOf(
    theme as (typeof themeOrder)[number]
  );
  const nextTheme = themeOrder[(currentIndex + 1) % themeOrder.length];

  const icon =
    theme === "light" ? (
      <Sun size={16} />
    ) : theme === "dark" ? (
      <Moon size={16} />
    ) : (
      <Monitor size={16} />
    );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          onClick={() => setTheme(nextTheme)}
          className="inline-flex items-center justify-center h-8 w-8 shrink-0 rounded-sm text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
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
