import { paintColor, type DesignNode, type Effect, type GradientPaint, type LineEnd } from "@canvylo/types";

/**
 * SVG markup for strokes and effects, shared by the canvas and by SVG/PNG export.
 * Documents can come from a shared file, so every value is re-validated here before it becomes markup.
 */

const num = (n: unknown, fallback = 0) => {
  const v = typeof n === "number" && Number.isFinite(n) ? n : fallback;
  return String(Math.round(v * 100) / 100);
};
const hex = (c: unknown) => (typeof c === "string" && /^#[0-9a-fA-F]{3,8}$/.test(c) ? c : "#000000");
const unit = (n: unknown, fallback = 1) => num(Math.min(1, Math.max(0, typeof n === "number" ? n : fallback)), fallback);
const safeId = (id: string) => id.replace(/[^A-Za-z0-9_-]/g, "_");

export function effectsOf(n: DesignNode): Effect[] {
  return (n.effects ?? []).filter((e) => e.visible);
}

/** The `<filter>` that draws a layer's shadows and blur, or null when it has none. */
export function effectsFilter(n: DesignNode): { id: string; markup: string } | null {
  const list = effectsOf(n);
  if (!list.length) return null;
  const id = `fx-${safeId(n.id)}`;
  const parts: string[] = [];
  const under: string[] = [];
  const over: string[] = [];
  let source = "SourceGraphic";
  list.forEach((e) => {
    if (e.type === "LAYER_BLUR") {
      parts.push(`<feGaussianBlur in="${source}" stdDeviation="${num(Math.max(0, e.radius) / 2)}" result="src"/>`);
      source = "src";
    }
  });
  list.forEach((e, i) => {
    if (e.type === "DROP_SHADOW") {
      parts.push(
        `<feGaussianBlur in="SourceAlpha" stdDeviation="${num(Math.max(0, e.blur) / 2)}" result="b${i}"/>`,
        `<feOffset in="b${i}" dx="${num(e.x)}" dy="${num(e.y)}" result="o${i}"/>`,
        `<feFlood flood-color="${hex(e.color)}" flood-opacity="${unit(e.opacity)}" result="c${i}"/>`,
        `<feComposite in="c${i}" in2="o${i}" operator="in" result="s${i}"/>`,
      );
      under.push(`s${i}`);
    } else if (e.type === "INNER_SHADOW") {
      parts.push(
        `<feFlood flood-color="${hex(e.color)}" flood-opacity="${unit(e.opacity)}" result="c${i}"/>`,
        `<feComposite in="c${i}" in2="SourceAlpha" operator="out" result="i${i}"/>`,
        `<feGaussianBlur in="i${i}" stdDeviation="${num(Math.max(0, e.blur) / 2)}" result="b${i}"/>`,
        `<feOffset in="b${i}" dx="${num(e.x)}" dy="${num(e.y)}" result="o${i}"/>`,
        `<feComposite in="o${i}" in2="SourceAlpha" operator="in" result="s${i}"/>`,
      );
      over.push(`s${i}`);
    }
  });
  const merge = [...under.reverse(), source, ...over].map((r) => `<feMergeNode in="${r}"/>`).join("");
  parts.push(`<feMerge>${merge}</feMerge>`);
  const markup = `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%" color-interpolation-filters="sRGB">${parts.join("")}</filter>`;
  return { id, markup };
}

/** Corner radii [tl, tr, br, bl] of a layer, each clamped to half the shorter side; null when square. */
export function cornerRadiiOf(n: DesignNode): [number, number, number, number] | null {
  if (!("cornerRadius" in n)) return null;
  const own = "cornerRadii" in n ? n.cornerRadii : undefined;
  const raw = own && own.length === 4 ? own : [n.cornerRadius, n.cornerRadius, n.cornerRadius, n.cornerRadius];
  const max = Math.max(0, Math.min(n.width, n.height) / 2);
  const r = raw.map((v) => Math.min(max, Math.max(0, Number.isFinite(v) ? v : 0))) as [number, number, number, number];
  return r.some((v) => v > 0) ? r : null;
}

/** The outline of a rectangle-like or elliptical layer as one SVG shape element carrying `extra` attributes. */
export function shapeGeometry(n: DesignNode, extra: string): string {
  if (n.type === "ELLIPSE") return `<ellipse cx="${num(n.width / 2)}" cy="${num(n.height / 2)}" rx="${num(n.width / 2)}" ry="${num(n.height / 2)}"${extra}/>`;
  const r = cornerRadiiOf(n);
  if (r && !r.every((v) => v === r[0])) {
    const [tl, tr, br, bl] = r.map(num) as [string, string, string, string];
    const w = n.width;
    const h = n.height;
    const d = `M${tl} 0H${num(w - r[1])}A${tr} ${tr} 0 0 1 ${num(w)} ${tr}V${num(h - r[2])}A${br} ${br} 0 0 1 ${num(w - r[2])} ${num(h)}H${bl}A${bl} ${bl} 0 0 1 0 ${num(h - r[3])}V${tl}A${tl} ${tl} 0 0 1 ${tl} 0Z`;
    return `<path d="${d}"${extra}/>`;
  }
  return `<rect width="${num(n.width)}" height="${num(n.height)}"${r ? ` rx="${num(r[0])}"` : ""}${extra}/>`;
}
const geometry = shapeGeometry;

/** Fill and stroke of a rectangle, frame or ellipse. Inside/outside strokes are clipped/masked double-width strokes. */
export function shapeMarkup(n: DesignNode, imageHref?: (assetId: string) => string | undefined): string {
  const fills = "fills" in n ? (n.fills ?? []) : [];
  const strokes = "strokes" in n ? (n.strokes ?? []) : [];
  // Fills are stored bottom to top, so each one is drawn over the previous.
  let out = fills.length ? "" : geometry(n, ' fill="none"');
  fills.forEach((fill, i) => {
    const gradientId = `gf-${safeId(n.id)}-${i}`;
    let fillDef = "";
    let fillAttrs = ' fill="none"';
    if (fill.type === "SOLID") fillAttrs = ` fill="${hex(fill.color)}" fill-opacity="${unit(fill.opacity)}"`;
    else if (fill.type === "IMAGE") {
      const href = fill.assetId ? imageHref?.(fill.assetId) : undefined;
      if (href) {
        const par = fill.scaleMode === "FIT" ? "xMidYMid meet" : fill.scaleMode === "STRETCH" ? "none" : "xMidYMid slice";
        fillDef = `<pattern id="${gradientId}" patternUnits="userSpaceOnUse" width="${num(n.width)}" height="${num(n.height)}"><image href="${href.replace(/"/g, "&quot;")}" width="${num(n.width)}" height="${num(n.height)}" preserveAspectRatio="${par}"/></pattern>`;
        fillAttrs = ` fill="url(#${gradientId})" fill-opacity="${unit(fill.opacity)}"`;
      } else fillAttrs = ' fill="#e5e5e5"';
    } else {
      fillDef = gradientDef(gradientId, fill);
      fillAttrs = ` fill="url(#${gradientId})" fill-opacity="${unit(fill.opacity)}"`;
    }
    out += fillDef + geometry(n, fillAttrs);
  });
  if (!strokes.length || !("strokeWidth" in n)) return out;

  const w = Math.max(0, (n.strokeWidth ?? 1));
  const id = safeId(n.id);
  const align = "strokeAlign" in n && n.strokeAlign ? n.strokeAlign : "CENTER";
  // Inside / outside strokes share one clip / mask; every stroke of the layer is drawn with it, bottom first.
  if (align === "INSIDE") out += `<clipPath id="sc-${id}">${geometry(n, "")}</clipPath>`;
  else if (align === "OUTSIDE") {
    out +=
      `<mask id="sm-${id}" maskUnits="userSpaceOnUse" x="${num(-w)}" y="${num(-w)}" width="${num(n.width + w * 2)}" height="${num(n.height + w * 2)}">` +
      `<rect x="${num(-w)}" y="${num(-w)}" width="${num(n.width + w * 2)}" height="${num(n.height + w * 2)}" fill="#fff"/>${geometry(n, ' fill="#000"')}</mask>`;
  }
  for (const stroke of strokes) {
    const base = ` fill="none" stroke="${hex(paintColor(stroke))}" stroke-opacity="${unit(stroke.opacity)}"${strokeExtras(n)}`;
    if (align === "INSIDE") out += geometry(n, `${base} stroke-width="${num(w * 2)}" clip-path="url(#sc-${id})"`);
    else if (align === "OUTSIDE") out += geometry(n, `${base} stroke-width="${num(w * 2)}" mask="url(#sm-${id})"`);
    else out += geometry(n, `${base} stroke-width="${num(w)}"`);
  }
  return out;
}

/** Baseline y of a single-line text layer. AUTO line height keeps the baseline at the font size; a fixed one centres the text in it. */
export function textBaseline(n: { fontSize: number; lineHeight: number | "AUTO" }): number {
  return n.lineHeight === "AUTO" ? n.fontSize : n.fontSize + (Math.max(0, n.lineHeight) - n.fontSize * 1.2) / 2;
}

/** `letter-spacing` attribute text for a TEXT layer ("" when there is none). */
export function letterSpacingAttr(n: { letterSpacing: number }): string {
  return n.letterSpacing && Number.isFinite(n.letterSpacing) ? ` letter-spacing="${num(n.letterSpacing)}"` : "";
}

/** `<linearGradient>` / `<radialGradient>` for a gradient fill, in bounding-box units. */
export function gradientDef(id: string, p: GradientPaint): string {
  const stops = [...p.stops]
    .sort((a, b) => a.position - b.position)
    .map((s) => `<stop offset="${unit(s.position, 0)}" stop-color="${hex(s.color)}" stop-opacity="${unit(s.opacity)}"/>`)
    .join("");
  if (p.type === "GRADIENT_RADIAL") return `<radialGradient id="${id}" cx="0.5" cy="0.5" r="0.5">${stops}</radialGradient>`;
  const a = ((Number.isFinite(p.angle) ? p.angle : 0) * Math.PI) / 180;
  const dx = Math.cos(a) / 2;
  const dy = Math.sin(a) / 2;
  const f = (v: number) => String(Math.round(v * 1000) / 1000);
  return `<linearGradient id="${id}" x1="${f(0.5 - dx)}" y1="${f(0.5 - dy)}" x2="${f(0.5 + dx)}" y2="${f(0.5 + dy)}">${stops}</linearGradient>`;
}

/** True for a VECTOR drawn with the Line / Arrow / Polygon / Star tools: it has its own fill and stroke instead of baked-in markup attributes. */
export function isDrawnVector(n: DesignNode): boolean {
  return n.type === "VECTOR" && Array.isArray(n.fills);
}

/** Presentation attributes for the group around a drawn vector's markup (fill and stroke come from the layer). */
export function vectorPaintAttrs(n: DesignNode): string {
  if (n.type !== "VECTOR") return "";
  const fill = n.fills?.[0];
  const stroke = n.strokes?.[0];
  const parts = [fill ? `fill="${hex(paintColor(fill))}" fill-opacity="${unit(fill.opacity)}"` : 'fill="none"'];
  if (stroke) {
    parts.push(`stroke="${hex(paintColor(stroke))}" stroke-opacity="${unit(stroke.opacity)}" stroke-width="${num(Math.max(0, n.strokeWidth ?? 1))}"${strokeExtras(n, "ROUND", "ROUND")}`);
    if (n.strokeStartCap && n.strokeStartCap !== "NONE") parts.push(`marker-start="url(#${markerId(n, "s")})"`);
    if (n.strokeEndCap && n.strokeEndCap !== "NONE") parts.push(`marker-end="url(#${markerId(n, "e")})"`);
  }
  return parts.join(" ");
}

const markerId = (n: DesignNode, side: "s" | "e") => `mk-${side}-${safeId(n.id)}`;

const CAP_ATTR = { NONE: "butt", ROUND: "round", SQUARE: "square" } as const;
const JOIN_ATTR = { MITER: "miter", BEVEL: "bevel", ROUND: "round" } as const;

/** `stroke-dasharray`, `stroke-linecap` and `stroke-linejoin` of a layer (validated: a shared file is untrusted). Leading space included, "" when plain. */
export function strokeExtras(n: DesignNode, defaultCap: "NONE" | "ROUND" | "SQUARE" = "NONE", defaultJoin: "MITER" | "BEVEL" | "ROUND" = "MITER"): string {
  const dash = Array.isArray(n.strokeDash) ? n.strokeDash.filter((v) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1000).slice(0, 8) : [];
  const cap = n.strokeCap && n.strokeCap in CAP_ATTR ? n.strokeCap : defaultCap;
  const join = n.strokeJoin && n.strokeJoin in JOIN_ATTR ? n.strokeJoin : defaultJoin;
  const dashAttr = dash.length && dash.some((v) => v > 0) ? ` stroke-dasharray="${dash.map(num).join(" ")}"` : "";
  const capAttr = cap !== "NONE" || defaultCap !== "NONE" ? ` stroke-linecap="${CAP_ATTR[cap]}"` : "";
  const joinAttr = join !== "MITER" || defaultJoin !== "MITER" ? ` stroke-linejoin="${JOIN_ATTR[join]}"` : "";
  return dashAttr + capAttr + joinAttr;
}

const MARKER_SHAPES: Record<Exclude<LineEnd, "NONE">, (c: string) => string> = {
  ARROW_LINES: (c) => `<path d="M1 1.5L7 5L1 8.5" fill="none" stroke="${c}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  ARROW_FILLED: (c) => `<path d="M0 0L10 5L0 10Z" fill="${c}"/>`,
  CIRCLE: (c) => `<circle cx="5" cy="5" r="4.5" fill="${c}"/>`,
  SQUARE: (c) => `<rect x="1" y="1" width="8" height="8" fill="${c}"/>`,
  DIAMOND: (c) => `<path d="M5 0L10 5L5 10L0 5Z" fill="${c}"/>`,
};

/** The `<marker>` definitions for the arrowheads of a drawn vector ("" when it has none). */
export function vectorMarkerDefs(n: DesignNode): string {
  if (n.type !== "VECTOR" || !n.strokes?.[0]) return "";
  const color = hex(paintColor(n.strokes[0]));
  // arrowheads grow with the stroke but are never smaller than 8 px
  const size = num(Math.max(8, 4 * Math.max(0, n.strokeWidth ?? 1)));
  const one = (side: "s" | "e", end: LineEnd | undefined) =>
    end && end !== "NONE" && end in MARKER_SHAPES
      ? `<marker id="${markerId(n, side)}" viewBox="0 0 10 10" refX="${end === "ARROW_LINES" ? 6 : 5}" refY="5" markerUnits="userSpaceOnUse" markerWidth="${size}" markerHeight="${size}" orient="auto-start-reverse" overflow="visible">${MARKER_SHAPES[end](color)}</marker>`
      : "";
  return one("s", n.strokeStartCap) + one("e", n.strokeEndCap);
}
