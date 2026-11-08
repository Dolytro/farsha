export interface HelpLink {
  id: string;
  label: string;
  url: string;
  keywords: string;
}

/** Where the Help menu leads. Only https addresses are opened. */
export const HELP_LINKS: HelpLink[] = [
  { id: "help-github", label: "Farsha on GitHub", url: "https://github.com/Dolytro/farsha", keywords: "source code repository open source" },
  { id: "help-issues", label: "Report an issue", url: "https://github.com/Dolytro/farsha/issues", keywords: "bug problem feedback" },
  { id: "help-privacy", label: "Privacy policy", url: "https://farsha.org/privacy", keywords: "data google drive" },
  { id: "help-terms", label: "Terms of use", url: "https://farsha.org/terms", keywords: "legal license" },
];

/** Open a help address in a new tab. Anything that is not an https link is refused (returns false). */
export function openHelpLink(url: string, open: (url: string, target: string, features: string) => unknown = (u, t, f) => window.open(u, t, f)): boolean {
  try {
    if (new URL(url).protocol !== "https:") return false;
  } catch {
    return false;
  }
  open(url, "_blank", "noopener,noreferrer");
  return true;
}
