import { createContext, useContext } from "react";
import type { ThemePreference } from "../lib/theme";

export const ThemeContext = createContext<{ preference: ThemePreference; setPreference: (theme: ThemePreference) => void } | null>(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme requires ThemeProvider");
  return context;
}
