import { useTheme } from "../context/ThemeContext";
import { normalizeTheme } from "../lib/theme";

export function ThemePicker({ mobile = false }: { mobile?: boolean }) {
  const { preference, setPreference } = useTheme();
  if (mobile) return (
    <div className="mobile-theme-picker">
      <p>Appearance</p>
      <div className="theme-options" role="group" aria-label="Appearance theme">
        {(["light", "dark", "system"] as const).map((theme) => (
          <button type="button" key={theme} aria-pressed={preference === theme} onClick={() => setPreference(theme)}>{theme.charAt(0).toUpperCase() + theme.slice(1)}</button>
        ))}
      </div>
    </div>
  );
  return (
    <label className="theme-picker">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></svg>
      <select aria-label="Appearance theme" value={preference} onChange={(event) => setPreference(normalizeTheme(event.target.value))}>
        <option value="light">Light</option><option value="dark">Dark</option><option value="system">System</option>
      </select>
    </label>
  );
}
