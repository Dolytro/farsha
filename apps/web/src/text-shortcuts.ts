export interface KeyLike {
  code: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

/**
 * Figma's text shortcuts as command ids:
 * Ctrl+Alt+J justify, Ctrl+Shift+U create link, Ctrl+Shift+8 / 7 bulleted / numbered list,
 * and the Adjust group: font size (Ctrl+Shift+> / <), font weight (Ctrl+Alt+> / <), line height (Alt+Shift+> / <), letter spacing (Alt+> / <).
 */
export function textShortcutCommand(e: KeyLike): string | null {
  const mod = e.ctrlKey || e.metaKey;
  const step = e.code === "Period" ? "up" : e.code === "Comma" ? "down" : null;
  if (mod && e.altKey && !e.shiftKey) {
    if (e.code === "KeyJ") return "text-align-justify";
    if (step) return `text-weight-${step}`;
  }
  if (mod && e.shiftKey && !e.altKey) {
    if (e.code === "KeyU") return "text-link";
    if (e.code === "Digit8") return "text-list-bullet";
    if (e.code === "Digit7") return "text-list-number";
    if (step) return `text-size-${step}`;
  }
  if (!mod && e.altKey && e.shiftKey && step) return `text-leading-${step}`;
  if (!mod && e.altKey && !e.shiftKey && step) return `text-tracking-${step}`;
  return null;
}
