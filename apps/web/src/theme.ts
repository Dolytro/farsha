export type ThemePreference = "light" | "dark" | "system";

export const THEME_KEY = "canvylo.theme";

/** The theme to draw: an explicit choice, or the system setting when the preference is "system". */
export function resolveTheme(preference: ThemePreference, systemDark: boolean): "light" | "dark" {
  return preference === "system" ? (systemDark ? "dark" : "light") : preference;
}

export function parseTheme(value: string | null | undefined): ThemePreference {
  return value === "light" || value === "dark" || value === "system" ? value : "system";
}
