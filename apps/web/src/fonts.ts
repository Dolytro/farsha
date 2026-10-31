/** Fonts offered in the font picker besides the built-in ones: popular Google Fonts (loaded from fonts.googleapis.com when first used). */
export const GOOGLE_FONTS: { name: string; kind: "sans-serif" | "serif" | "monospace" | "cursive" }[] = [
  ...["Inter", "Roboto", "Open Sans", "Lato", "Montserrat", "Poppins", "Nunito", "Nunito Sans", "Source Sans 3", "Raleway", "Work Sans", "DM Sans", "Manrope", "Rubik", "Barlow", "Mulish", "Karla", "Outfit", "Plus Jakarta Sans", "Figtree", "Sora", "Lexend", "Urbanist", "Quicksand", "Cabin", "Ubuntu", "Noto Sans", "Fira Sans", "PT Sans", "Oswald", "Bebas Neue", "Josefin Sans", "Archivo", "Heebo", "Hind", "Titillium Web", "Assistant", "Exo 2", "Kanit", "Prompt", "Hind Siliguri", "Noto Sans Bengali", "Anek Bangla"].map((name) => ({ name, kind: "sans-serif" as const })),
  ...["Playfair Display", "Merriweather", "Lora", "PT Serif", "Noto Serif", "Libre Baskerville", "Crimson Text", "EB Garamond", "Cormorant Garamond", "Source Serif 4", "Bitter", "Roboto Slab", "Zilla Slab", "DM Serif Display", "Spectral"].map((name) => ({ name, kind: "serif" as const })),
  ...["Roboto Mono", "Source Code Pro", "Fira Code", "JetBrains Mono", "IBM Plex Mono", "Space Mono", "Inconsolata"].map((name) => ({ name, kind: "monospace" as const })),
  ...["Pacifico", "Caveat", "Dancing Script", "Lobster", "Satisfy"].map((name) => ({ name, kind: "cursive" as const })),
];

/** Fonts the editor offers without any download (the browser or system supplies them). */
export const BUILT_IN_FONTS = ["Inter", "Roboto", "Arial", "Helvetica", "Georgia", "Times New Roman", "Courier New", "System UI"];

const byName = new Map(GOOGLE_FONTS.map((f) => [f.name.toLowerCase(), f]));

/** The first family of a CSS font stack: `Inter, system-ui, sans-serif` gives `Inter`. */
export const firstFamily = (stack: string): string => stack.split(",")[0]!.trim().replace(/^['"]|['"]$/g, "");

/** True for a Google font that has to be downloaded (the built-in names never are). */
export const isGoogleFont = (family: string): boolean => {
  const name = firstFamily(family);
  return byName.has(name.toLowerCase()) && !BUILT_IN_FONTS.includes(name);
};

/** A CSS font stack for a family name, with a fallback of the right kind. */
export function fontStack(family: string): string {
  const known = byName.get(family.toLowerCase());
  const quoted = /[^A-Za-z0-9_-]/.test(family) ? `'${family}'` : family;
  return `${quoted}, ${known?.kind ?? "sans-serif"}`;
}

/** The stylesheet address that loads every weight of a Google font. */
export function googleFontUrl(family: string): string {
  return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, "+")}:wght@100;200;300;400;500;600;700;800;900&display=swap`;
}

const requested = new Set<string>();

/** Load a Google font once. Resolves when the browser has the font (or gave up), so layout can be measured again. */
export async function loadGoogleFont(family: string): Promise<boolean> {
  const name = firstFamily(family);
  const known = byName.get(name.toLowerCase());
  if (!known || typeof document === "undefined") return false;
  if (!requested.has(known.name)) {
    requested.add(known.name);
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = googleFontUrl(known.name);
    document.head.appendChild(link);
  }
  try {
    await document.fonts.load(`400 16px "${known.name}"`);
    return document.fonts.check(`16px "${known.name}"`);
  } catch {
    return false;
  }
}

/** Fonts installed on this computer, when the browser lets the page list them (Chromium asks for permission). Empty otherwise. */
export async function listLocalFonts(): Promise<string[]> {
  const query = (window as unknown as { queryLocalFonts?: () => Promise<{ family: string }[]> }).queryLocalFonts;
  if (!query) return [];
  try {
    const all = await query.call(window);
    return [...new Set(all.map((f) => f.family))].sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

/** Filter a list of names by what was typed (every word must appear, any case). */
export function matchFonts<T extends string>(names: T[], query: string): T[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return words.length ? names.filter((n) => words.every((w) => n.toLowerCase().includes(w))) : names;
}
