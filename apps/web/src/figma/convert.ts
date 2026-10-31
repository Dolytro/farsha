import type { ClipNode } from "../clipboard";

/**
 * Figma "NODE_CHANGES" message (decoded Kiwi) -> Farsha layers.
 * Supported: frames, groups, rectangles, ellipses, text, and vector shapes (as VECTOR layers).
 * Not supported yet, so they degrade: auto layout (positions are already computed, so layouts still
 * look right), components / instances (become frames), images (grey placeholder), gradients (first
 * stop as a flat colour), effects (dropped).
 */

interface Guid {
  sessionID: number;
  localID: number;
}

interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

interface FigPaint {
  type?: string;
  color?: Rgba;
  opacity?: number;
  visible?: boolean;
  gradientStops?: { color: Rgba; position: number }[];
}

interface FigNode {
  guid: Guid;
  parentIndex?: { guid: Guid; position: string };
  type: string;
  name?: string;
  visible?: boolean;
  opacity?: number;
  size?: { x: number; y: number };
  transform?: { m00: number; m01: number; m02: number; m10: number; m11: number; m12: number };
  fillPaints?: FigPaint[];
  strokePaints?: FigPaint[];
  strokeWeight?: number;
  cornerRadius?: number;
  rectangleTopLeftCornerRadius?: number;
  rectangleTopRightCornerRadius?: number;
  rectangleBottomLeftCornerRadius?: number;
  rectangleBottomRightCornerRadius?: number;
  frameMaskDisabled?: boolean;
  internalOnly?: boolean;
  textData?: { characters?: string };
  characters?: string;
  fontSize?: number;
  fontName?: { family?: string; style?: string };
  textAlignHorizontal?: string;
  lineHeight?: { value: number; units: string };
  letterSpacing?: { value: number; units: string };
  fillGeometry?: { commandsBlob: number }[];
  vectorData?: { vectorNetworkBlob?: number };
}

const key = (g: Guid) => `${g.sessionID}:${g.localID}`;
const hex2 = (n: number) => Math.max(0, Math.min(255, Math.round(n * 255))).toString(16).padStart(2, "0");
const toHex = (c: Rgba) => `#${hex2(c.r)}${hex2(c.g)}${hex2(c.b)}`;
const round = (n: number) => Math.round(n * 100) / 100;

type Paint = { type: "SOLID"; color: string; opacity: number };

/** Figma paints -> flat solid paints (gradients use their first stop, images a grey placeholder). */
function paints(list: FigPaint[] | undefined): Paint[] {
  const out: Paint[] = [];
  for (const p of list ?? []) {
    if (p.visible === false) continue;
    const alpha = p.opacity ?? 1;
    if (p.type === "SOLID" && p.color) out.push({ type: "SOLID", color: toHex(p.color), opacity: round(alpha * p.color.a) });
    else if (p.type?.startsWith("GRADIENT") && p.gradientStops?.[0]) {
      const s = p.gradientStops[0].color;
      out.push({ type: "SOLID", color: toHex(s), opacity: round(alpha * s.a) });
    } else if (p.type === "IMAGE") out.push({ type: "SOLID", color: "#d9d9d9", opacity: alpha });
  }
  return out;
}

const WEIGHTS: [RegExp, number][] = [
  [/thin|hairline/i, 100],
  [/extra\s*light|ultra\s*light/i, 200],
  [/light/i, 300],
  [/medium/i, 500],
  [/semi\s*bold|demi/i, 600],
  [/extra\s*bold|ultra\s*bold|heavy/i, 800],
  [/black/i, 900],
  [/bold/i, 700],
];

export function weightFromStyle(style: string | undefined): number {
  if (!style) return 400;
  return WEIGHTS.find(([re]) => re.test(style))?.[1] ?? 400;
}

/** Position, size and rotation. Figma stores the rotated top-left corner; Farsha rotates around the centre. */
function geometry(n: FigNode): { x: number; y: number; width: number; height: number; rotation: number } {
  const w = n.size?.x ?? 0;
  const h = n.size?.y ?? 0;
  const t = n.transform ?? { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 };
  const cx = t.m02 + (w * t.m00 + h * t.m01) / 2;
  const cy = t.m12 + (w * t.m10 + h * t.m11) / 2;
  const rotation = Math.abs(t.m10) < 1e-6 && Math.abs(t.m00 - 1) < 1e-6 ? 0 : round((Math.atan2(t.m10, t.m00) * 180) / Math.PI);
  return { x: round(cx - w / 2), y: round(cy - h / 2), width: round(w), height: round(h), rotation };
}

// ---------- vector geometry ----------

const f32 = (dv: DataView, o: number) => dv.getFloat32(o, true);
const fmt = (n: number) => String(round(n));

/** Figma path command blob -> SVG path data. */
export function commandsToPath(bytes: Uint8Array): string {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const parts: string[] = [];
  let o = 0;
  while (o < bytes.length) {
    const cmd = bytes[o++]!;
    const need = cmd === 1 || cmd === 2 ? 2 : cmd === 3 ? 4 : cmd === 4 ? 6 : 0;
    if (cmd > 4 || o + need * 4 > bytes.length) break;
    const v = Array.from({ length: need }, (_, i) => fmt(f32(dv, o + i * 4)));
    o += need * 4;
    parts.push(["Z", "M", "L", "Q", "C"][cmd]! + v.join(" "));
  }
  return parts.join("");
}

/** Figma vector network blob (vertices + bezier segments) -> SVG path data, chaining connected segments. */
export function networkToPath(bytes: Uint8Array): string {
  if (bytes.length < 12) return "";
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const nv = dv.getUint32(0, true);
  const ns = dv.getUint32(4, true);
  if (12 + nv * 12 + ns * 28 > bytes.length) return "";
  const verts = Array.from({ length: nv }, (_, i) => ({ x: f32(dv, 12 + i * 12 + 4), y: f32(dv, 12 + i * 12 + 8) }));
  const parts: string[] = [];
  let current = -1;
  let first = -1;
  for (let i = 0; i < ns; i++) {
    const o = 12 + nv * 12 + i * 28;
    const a = dv.getUint32(o + 4, true);
    const b = dv.getUint32(o + 16, true);
    const va = verts[a];
    const vb = verts[b];
    if (!va || !vb) continue;
    if (a !== current) {
      parts.push(`M${fmt(va.x)} ${fmt(va.y)}`);
      first = a;
    }
    const c1 = { x: va.x + f32(dv, o + 8), y: va.y + f32(dv, o + 12) };
    const c2 = { x: vb.x + f32(dv, o + 20), y: vb.y + f32(dv, o + 24) };
    const straight = c1.x === va.x && c1.y === va.y && c2.x === vb.x && c2.y === vb.y;
    parts.push(straight ? `L${fmt(vb.x)} ${fmt(vb.y)}` : `C${fmt(c1.x)} ${fmt(c1.y)} ${fmt(c2.x)} ${fmt(c2.y)} ${fmt(vb.x)} ${fmt(vb.y)}`);
    current = b;
    if (b === first) {
      parts.push("Z");
      current = -1;
    }
  }
  return parts.join("");
}

function vectorMarkup(d: string, fill: Paint | undefined, stroke: Paint | undefined, strokeWidth: number): string {
  const attrs = [
    `d="${d}"`,
    `fill="${fill ? fill.color : "none"}"`,
    fill && fill.opacity !== 1 ? `fill-opacity="${fill.opacity}"` : "",
    stroke ? `stroke="${stroke.color}" stroke-width="${strokeWidth}"` : "",
    stroke && stroke.opacity !== 1 ? `stroke-opacity="${stroke.opacity}"` : "",
  ].filter(Boolean);
  return `<path ${attrs.join(" ")}/>`;
}

// ---------- tree ----------

const CONTAINERS = new Set(["FRAME", "SYMBOL", "INSTANCE", "COMPONENT", "COMPONENT_SET", "SECTION"]);
const VECTORS = new Set(["VECTOR", "LINE", "STAR", "REGULAR_POLYGON", "BOOLEAN_OPERATION"]);

interface Blobs {
  [i: number]: Uint8Array | undefined;
}

function cornerRadius(n: FigNode): number {
  if (typeof n.cornerRadius === "number") return n.cornerRadius;
  return Math.max(n.rectangleTopLeftCornerRadius ?? 0, n.rectangleTopRightCornerRadius ?? 0, n.rectangleBottomLeftCornerRadius ?? 0, n.rectangleBottomRightCornerRadius ?? 0);
}

function convertNode(n: FigNode, kids: Map<string, FigNode[]>, blobs: Blobs): ClipNode | null {
  if (n.visible === false) return null;
  const g = geometry(n);
  const fills = paints(n.fillPaints);
  const strokes = paints(n.strokePaints);
  const base = { name: n.name ?? n.type, ...g, opacity: n.opacity ?? 1 };
  const paint = { fills, strokes, strokeWidth: n.strokeWeight ?? 1 };
  const children = () => (kids.get(key(n.guid)) ?? []).map((c) => convertNode(c, kids, blobs)).filter((c): c is ClipNode => c !== null);

  if (CONTAINERS.has(n.type)) {
    return { type: "FRAME", props: { ...base, ...paint, cornerRadius: cornerRadius(n), clipsContent: !n.frameMaskDisabled }, children: children() };
  }
  switch (n.type) {
    case "GROUP":
      return { type: "GROUP", props: { ...base }, children: children() };
    case "RECTANGLE":
    case "ROUNDED_RECTANGLE":
      return { type: "RECTANGLE", props: { ...base, ...paint, cornerRadius: cornerRadius(n) }, children: [] };
    case "ELLIPSE":
      return { type: "ELLIPSE", props: { ...base, ...paint }, children: [] };
    case "TEXT": {
      const characters = n.textData?.characters ?? n.characters ?? "";
      if (!characters) return null;
      const size = n.fontSize ?? 16;
      const lh = n.lineHeight;
      const lineHeight = lh?.units === "PIXELS" ? lh.value : lh?.units === "PERCENT" ? (lh.value / 100) * size : "AUTO";
      const ls = n.letterSpacing;
      const letterSpacing = ls?.units === "PIXELS" ? ls.value : ls?.units === "PERCENT" ? (ls.value / 100) * size : 0;
      const align = n.textAlignHorizontal === "CENTER" ? "CENTER" : n.textAlignHorizontal === "RIGHT" ? "RIGHT" : "LEFT";
      return {
        type: "TEXT",
        props: { ...base, name: n.name ?? characters.slice(0, 40), characters, fontSize: size, fontFamily: n.fontName?.family ?? "Inter", fontWeight: weightFromStyle(n.fontName?.style), lineHeight, letterSpacing, textAlign: align, fills },
        children: [],
      };
    }
    default:
      break;
  }
  if (VECTORS.has(n.type)) {
    const geo = n.fillGeometry?.[0]?.commandsBlob;
    const net = n.vectorData?.vectorNetworkBlob;
    const bytes = geo !== undefined ? blobs[geo] : net !== undefined ? blobs[net] : undefined;
    const d = bytes ? (geo !== undefined ? commandsToPath(bytes) : networkToPath(bytes)) : "";
    const w = g.width || 1;
    const h = g.height || 1;
    if (d) {
      return {
        type: "VECTOR",
        props: { ...base, width: w, height: h, viewBox: `0 0 ${w} ${h}`, markup: vectorMarkup(d, fills[0], strokes[0], n.strokeWeight ?? 1) },
        children: [],
      };
    }
    return { type: "RECTANGLE", props: { ...base, ...paint, cornerRadius: 0 }, children: [] }; // no geometry: keep the box
  }
  return null; // slices, stickies, widgets, ...
}

/** Convert a decoded Figma message into top-level Farsha layers (canvas coordinates preserved). */
export function convertMessage(msg: Record<string, unknown>): ClipNode[] {
  const changes = (msg.nodeChanges as FigNode[] | undefined) ?? [];
  const blobs: Blobs = {};
  ((msg.blobs as { bytes: Uint8Array }[] | undefined) ?? []).forEach((b, i) => {
    blobs[i] = b.bytes;
  });

  const byKey = new Map(changes.map((n) => [key(n.guid), n]));
  const kids = new Map<string, FigNode[]>();
  for (const n of changes) {
    const p = n.parentIndex;
    if (!p) continue;
    const list = kids.get(key(p.guid)) ?? [];
    list.push(n);
    kids.set(key(p.guid), list);
  }
  // Siblings are ordered by a fractional-index string, lowest at the back.
  for (const list of kids.values()) list.sort((a, b) => ((a.parentIndex?.position ?? "") < (b.parentIndex?.position ?? "") ? -1 : 1));

  // Top-level layers are the children of a page (CANVAS), or layers whose parent isn't in the paste.
  const roots = changes.filter((n) => {
    if (n.type === "DOCUMENT" || n.type === "CANVAS" || n.internalOnly) return false;
    const parent = n.parentIndex ? byKey.get(key(n.parentIndex.guid)) : undefined;
    return !parent || parent.type === "CANVAS" || parent.type === "DOCUMENT";
  });
  roots.sort((a, b) => ((a.parentIndex?.position ?? "") < (b.parentIndex?.position ?? "") ? -1 : 1));
  return roots.map((n) => convertNode(n, kids, blobs)).filter((c): c is ClipNode => c !== null);
}
