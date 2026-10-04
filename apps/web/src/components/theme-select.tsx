"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { THEME_OPTIONS } from "./theme-options";

const subscribe = () => () => {};

/** Settings' appearance picker. The stored theme is only known in the browser, hence the guard. */
export function ThemeSelect() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  return (
    <ToggleGroup
      variant="outline"
      aria-label="Aparência"
      value={mounted && theme ? [theme] : []}
      onValueChange={(value) => {
        const next = value[0];
        if (typeof next === "string") setTheme(next);
      }}
    >
      {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
        <ToggleGroupItem key={value} value={value} aria-label={label}>
          <Icon aria-hidden />
          {label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
