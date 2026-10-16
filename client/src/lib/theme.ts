export type ThemePreference = "light" | "dark" | "system";
export const THEME_STORAGE_KEY = "media-extensions-theme";

export function normalizeTheme(value: unknown): ThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}

export function readThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  try { return normalizeTheme(window.localStorage.getItem(THEME_STORAGE_KEY)); }
  catch { return normalizeTheme(document.documentElement.dataset.themePreference); }
}

export function applyTheme(preference: ThemePreference) {
  const theme = preference === "system"
    ? window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
    : preference;
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.themePreference = preference;
  document.documentElement.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#101112" : "#f6f5f1");
}
