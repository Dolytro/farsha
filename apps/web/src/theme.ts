export type ThemePreference = "light" | "dark" | "system";

export const THEME_KEY = "farsha.theme";

/** The theme to draw: an explicit choice, or the system setting when the preference is "system". */
export function resolveTheme(preference: ThemePreference, systemDark: boolean): "light" | "dark" {
  return preference === "system" ? (systemDark ? "dark" : "light") : preference;
}

/** Nothing saved yet means the Farsha dark look; an unreadable value falls back to the system setting. */
export function parseTheme(value: string | null | undefined): ThemePreference {
  if (value == null) return "dark";
  return value === "light" || value === "dark" || value === "system" ? value : "system";
}
