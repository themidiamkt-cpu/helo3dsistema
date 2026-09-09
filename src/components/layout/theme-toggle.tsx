"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/providers/theme-provider";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const Icon = theme === "dark" ? Sun : Moon;

  return (
    <Button type="button" variant="outline" className="w-full justify-start gap-2" onClick={toggleTheme}>
      <Icon className="size-4" />
      {theme === "dark" ? "Modo claro" : "Modo escuro"}
    </Button>
  );
}
