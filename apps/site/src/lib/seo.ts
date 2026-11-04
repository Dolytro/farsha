/** Single place for the facts search engines and social cards read about the site. */
export const SITE_URL = "https://farsha.org";
export const SITE_NAME = "Farsha";
export const SITE_TITLE = "Farsha: free, open source design tool";
export const SITE_DESCRIPTION =
  "Farsha is a free, open source Figma alternative that runs in your browser. Same panels and shortcuts as Figma, Dev Mode code export, share links, and your files stay in your own Google Drive.";
export const KEYWORDS = [
  "Farsha",
  "free design tool",
  "open source design tool",
  "Figma alternative",
  "free Figma alternative",
  "open source Figma",
  "UI design tool",
  "UX design tool",
  "browser design tool",
  "design handoff",
  "Dev Mode",
  "design to code",
  "Google Drive design files",
];

export const MAKER = { name: "Dolytro", url: "https://dolytro.com" } as const;
/** Dolytro's social profiles; Farsha news is posted there. Used by the footer links and the JSON-LD `sameAs`. */
export const SOCIALS: { name: string; url: string }[] = [
  { name: "Facebook", url: "https://www.facebook.com/share/1CfyyzePHR/" },
  { name: "YouTube", url: "https://youtube.com/@dolytro" },
  { name: "Instagram", url: "https://www.instagram.com/dolytro.ig/" },
  { name: "X", url: "https://x.com/dolytro" },
  { name: "Threads", url: "https://www.threads.net/@dolytro.ig" },
  { name: "TikTok", url: "https://www.tiktok.com/@dolytro" },
  { name: "Pinterest", url: "https://www.pinterest.com/dolytro_/" },
];

export const REPO_URL = "https://github.com/Dolytro/farsha";
/** Set to a Buy Me a Coffee URL (for example "https://buymeacoffee.com/farsha") to show donate links again. Hidden for now. */
export const DONATE_URL: string | null = null;
export const CONTACT_EMAIL = "contact@farsha.org";
