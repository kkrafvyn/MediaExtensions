import { useEffect, useState, type ReactNode } from "react";
import { ThemeContext } from "./ThemeContext";
import { applyTheme, normalizeTheme, readThemePreference, THEME_STORAGE_KEY, type ThemePreference } from "../lib/theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setState] = useState<ThemePreference>(readThemePreference);

  useEffect(() => {
    applyTheme(preference);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => { if (preference === "system") applyTheme("system"); };
    const onStorage = (event: StorageEvent) => {
      if (event.storageArea === window.localStorage && (event.key === THEME_STORAGE_KEY || event.key === null)) {
        const next = normalizeTheme(event.newValue);
        setState(next);
        applyTheme(next);
      }
    };
    media.addEventListener("change", onSystemChange);
    window.addEventListener("storage", onStorage);
    return () => {
      media.removeEventListener("change", onSystemChange);
      window.removeEventListener("storage", onStorage);
    };
  }, [preference]);

  function setPreference(next: ThemePreference) {
    setState(next);
    applyTheme(next);
    try { window.localStorage.setItem(THEME_STORAGE_KEY, next); } catch { /* Keep the choice for this session when storage is unavailable. */ }
  }

  return <ThemeContext.Provider value={{ preference, setPreference }}>{children}</ThemeContext.Provider>;
}
