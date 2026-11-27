/** Normalise what a person types into the hex field ("f00", "#FF0000", "ff0000") to "#rrggbb", or null when it is not a colour. */
export function parseHex(text: string): string | null {
  const t = text.trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(t)) return `#${[...t].map((c) => c + c).join("").toLowerCase()}`;
  if (/^[0-9a-f]{6}$/i.test(t)) return `#${t.toLowerCase()}`;
  return null;
}

/** Like parseHex, but also reads an alpha: "ff000080" or "f008" give the colour and an opacity (0 to 1, two decimals). */
export function parseHexAlpha(text: string): { hex: string; alpha?: number } | null {
  const t = text.trim().replace(/^#/, "");
  if (/^[0-9a-f]{4}$/i.test(t)) return { hex: parseHex(t.slice(0, 3))!, alpha: Math.round((parseInt(t[3]! + t[3]!, 16) / 255) * 100) / 100 };
  if (/^[0-9a-f]{8}$/i.test(t)) return { hex: `#${t.slice(0, 6).toLowerCase()}`, alpha: Math.round((parseInt(t.slice(6), 16) / 255) * 100) / 100 };
  const hex = parseHex(t);
  return hex ? { hex } : null;
}
