/** Colour conversions for the colour picker. Colours are "#rrggbb" strings; hue is 0..360, the rest 0..1 (RGB 0..255). */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}
export interface Hsv {
  h: number;
  s: number;
  v: number;
}
export interface Hsl {
  h: number;
  s: number;
  l: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));

/** "#abc", "abc" or "#aabbcc" to "#aabbcc"; null when it is not a colour. */
export function normalizeHex(input: string): string | null {
  const m = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(input.trim());
  if (!m) return null;
  const h = m[1]!.length === 3 ? m[1]!.split("").map((c) => c + c).join("") : m[1]!;
  return `#${h.toLowerCase()}`;
}

export function hexToRgb(hex: string): Rgb {
  const h = (normalizeHex(hex) ?? "#000000").slice(1);
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  return `#${[r, g, b].map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0")).join("")}`;
}

export function rgbToHsv({ r, g, b }: Rgb): Hsv {
  const R = r / 255;
  const G = g / 255;
  const B = b / 255;
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === R) h = ((G - B) / d) % 6;
    else if (max === G) h = (B - R) / d + 2;
    else h = (R - G) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

export function hsvToRgb({ h, s, v }: Hsv): Rgb {
  const H = ((h % 360) + 360) % 360;
  const S = clamp(s, 0, 1);
  const V = clamp(v, 0, 1);
  const c = V * S;
  const x = c * (1 - Math.abs(((H / 60) % 2) - 1));
  const m = V - c;
  const [r, g, b] = H < 60 ? [c, x, 0] : H < 120 ? [x, c, 0] : H < 180 ? [0, c, x] : H < 240 ? [0, x, c] : H < 300 ? [x, 0, c] : [c, 0, x];
  return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
}

export function rgbToHsl(rgb: Rgb): Hsl {
  const { h, s: sv, v } = rgbToHsv(rgb);
  const l = v * (1 - sv / 2);
  return { h, s: l === 0 || l === 1 ? 0 : (v - l) / Math.min(l, 1 - l), l };
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
  const S = clamp(s, 0, 1);
  const L = clamp(l, 0, 1);
  const v = L + S * Math.min(L, 1 - L);
  return hsvToRgb({ h, s: v === 0 ? 0 : 2 * (1 - L / v), v });
}

export const hexToHsv = (hex: string): Hsv => rgbToHsv(hexToRgb(hex));
export const hsvToHex = (hsv: Hsv): string => rgbToHex(hsvToRgb(hsv));

/** A colour as CSS text: "rgb(17, 34, 51)". */
export const cssColor = (hex: string): string => {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${r}, ${g}, ${b})`;
};

/**
 * Read a colour typed as CSS: "#abc", "#aabbcc", "rgb(1, 2, 3)", "rgb(1 2 3)", "hsl(210, 50%, 40%)" or "hsb(210, 50%, 40%)".
 * Returns "#rrggbb", or null when the text is not one of those.
 */
export function parseCssColor(input: string): string | null {
  const hex = normalizeHex(input);
  if (hex) return hex;
  const m = /^(rgba?|hsla?|hsb)\(\s*([^)]*)\)$/i.exec(input.trim());
  if (!m) return null;
  const parts = m[2]!.split(/[\s,/]+/).filter(Boolean);
  if (parts.length < 3 || parts.length > 4) return null;
  const nums = parts.slice(0, 3).map((p) => (/^-?\d+(\.\d+)?%?$/.test(p) ? { v: parseFloat(p), pct: p.endsWith("%") } : null));
  if (nums.some((n) => !n)) return null;
  const [a, b, c] = nums as { v: number; pct: boolean }[];
  const kind = m[1]!.toLowerCase();
  if (kind.startsWith("rgb")) {
    const ch = (n: { v: number; pct: boolean }) => (n.pct ? (n.v / 100) * 255 : n.v);
    return rgbToHex({ r: ch(a!), g: ch(b!), b: ch(c!) });
  }
  const h = a!.v;
  const s = clamp(b!.v, 0, 100) / 100;
  const x = clamp(c!.v, 0, 100) / 100;
  return kind === "hsb" ? hsvToHex({ h, s, v: x }) : rgbToHex(hslToRgb({ h, s, l: x }));
}

/** Every solid colour used on the page (fills and strokes), lower case, most used first: the picker's "On this page" list. */
export function usedColors(paintLists: unknown[][]): string[] {
  const counts = new Map<string, number>();
  for (const list of paintLists) {
    for (const p of list) {
      const c = (p as { type?: string; color?: string })?.type === "SOLID" ? normalizeHex((p as { color: string }).color) : null;
      if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([c]) => c);
}
