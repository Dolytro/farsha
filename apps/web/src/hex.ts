/** Normalise what a person types into the hex field ("f00", "#FF0000", "ff0000") to "#rrggbb", or null when it is not a colour. */
export function parseHex(text: string): string | null {
  const t = text.trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(t)) return `#${[...t].map((c) => c + c).join("").toLowerCase()}`;
  if (/^[0-9a-f]{6}$/i.test(t)) return `#${t.toLowerCase()}`;
  return null;
}
