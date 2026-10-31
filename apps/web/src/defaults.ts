import type { DesignNode, Paint } from "@farsha/types";

/** Figma's "Set default properties": the look new shapes start with. */
export interface ShapeDefaults {
  fills?: Paint[];
  strokes?: Paint[];
  strokeWidth?: number;
  cornerRadius?: number;
  opacity?: number;
}

const KEY = "farsha.shape-defaults";

/** The defaults a layer would set: only what it has. Text and groups have nothing to give. */
export function extractDefaults(n: DesignNode | undefined): ShapeDefaults | null {
  if (!n || n.type === "TEXT" || n.type === "GROUP" || n.type === "PAGE" || n.type === "DOCUMENT") return null;
  const any = n as unknown as ShapeDefaults;
  const out: ShapeDefaults = {};
  if (Array.isArray(any.fills)) out.fills = any.fills.map((p) => ({ ...p }));
  if (Array.isArray(any.strokes)) out.strokes = any.strokes.map((p) => ({ ...p }));
  if (typeof any.strokeWidth === "number") out.strokeWidth = any.strokeWidth;
  if (typeof any.cornerRadius === "number") out.cornerRadius = any.cornerRadius;
  if (typeof n.opacity === "number") out.opacity = n.opacity;
  return out;
}

/** Layer props for a new shape: its own start values, with the saved defaults laid over them. Corner radius only fits rectangles and frames. */
export function withDefaults(type: DesignNode["type"], props: Record<string, unknown>, d: ShapeDefaults | null): Record<string, unknown> {
  if (!d || (type !== "RECTANGLE" && type !== "ELLIPSE" && type !== "FRAME")) return props;
  const out: Record<string, unknown> = { ...props };
  if (d.fills) out.fills = d.fills;
  if (d.strokes) out.strokes = d.strokes;
  if (d.strokeWidth !== undefined) out.strokeWidth = d.strokeWidth;
  if (d.cornerRadius !== undefined && type !== "ELLIPSE") out.cornerRadius = d.cornerRadius;
  if (d.opacity !== undefined) out.opacity = d.opacity;
  return out;
}

export function loadDefaults(): ShapeDefaults | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ShapeDefaults) : null;
  } catch {
    return null;
  }
}

export function saveDefaults(d: ShapeDefaults | null): void {
  try {
    if (d) localStorage.setItem(KEY, JSON.stringify(d));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable: the defaults last until reload only through the caller */
  }
}
