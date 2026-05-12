import type { Theme, ThemeKey } from "./types";
import { savannaTheme } from "./savanna";

export type { Theme, ThemeKey, ThemePalette } from "./types";

export const THEMES: Record<ThemeKey, Theme> = {
  savanna: savannaTheme,
};

export const DEFAULT_THEME: ThemeKey = "savanna";

export function resolveTheme(key: string | undefined): Theme {
  if (key && key in THEMES) return THEMES[key as ThemeKey];
  return THEMES[DEFAULT_THEME];
}
