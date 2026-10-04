import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";

export type ThemeChoice = "system" | "light" | "dark";

export const THEME_OPTIONS: readonly { value: ThemeChoice; label: string; icon: LucideIcon }[] = [
  { value: "system", label: "Automático", icon: Monitor },
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
];
