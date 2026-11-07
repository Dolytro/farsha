import { cssBlendMode, paintColor, type DesignNode, type Effect, type GradientPaint, type LineEnd, type Paint } from "@farsha/types";

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
/** Radius of the visible background blur of a layer (0 when it has none); a glass effect blurs the background too. */
export function backgroundBlurOf(n: DesignNode): number {
  const e = effectsOf(n).find((x) => x.type === "BACKGROUND_BLUR" || x.type === "GLASS");
  return e && (e.type === "BACKGROUND_BLUR" || e.type === "GLASS") && Number.isFinite(e.radius) ? Math.max(0, e.radius) : 0;
}

/** White tint of a visible glass effect, 0..1 (0 when there is none). */
export function glassLightOf(n: DesignNode): number {
  const e = effectsOf(n).find((x) => x.type === "GLASS");
  return e && e.type === "GLASS" && Number.isFinite(e.light) ? Math.min(1, Math.max(0, e.light)) : 0;
}

export function effectsFilter(n: DesignNode): { id: string; markup: string } | null {
  const list = effectsOf(n).filter((e) => e.type !== "BACKGROUND_BLUR" && e.type !== "GLASS");
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
      const spread = Number.isFinite(e.spread) ? (e.spread as number) : 0;
      const base = spread ? `m${i}` : "SourceAlpha";
      if (spread) parts.push(`<feMorphology in="SourceAlpha" operator="${spread > 0 ? "dilate" : "erode"}" radius="${num(Math.abs(spread))}" result="m${i}"/>`);
      parts.push(
        `<feGaussianBlur in="${base}" stdDeviation="${num(Math.max(0, e.blur) / 2)}" result="b${i}"/>`,
        `<feOffset in="b${i}" dx="${num(e.x)}" dy="${num(e.y)}" result="o${i}"/>`,
        `<feFlood flood-color="${hex(e.color)}" flood-opacity="${unit(e.opacity)}" result="c${i}"/>`,
        `<feComposite in="c${i}" in2="o${i}" operator="in" result="${e.showBehind === false ? `k${i}` : `s${i}`}"/>`,
      );
      // "Show behind transparent areas" off: the shape's own area is cut out of the shadow
      if (e.showBehind === false) parts.push(`<feComposite in="k${i}" in2="SourceAlpha" operator="out" result="s${i}"/>`);
      under.push(`s${i}`);
    } else if (e.type === "INNER_SHADOW") {
      const spread = Number.isFinite(e.spread) ? (e.spread as number) : 0;
      const base = spread ? `m${i}` : "SourceAlpha";
      // an inner shadow's spread eats into the shape: the shadow starts where the shrunken shape ends
      if (spread) parts.push(`<feMorphology in="SourceAlpha" operator="${spread > 0 ? "erode" : "dilate"}" radius="${num(Math.abs(spread))}" result="m${i}"/>`);
      parts.push(
        `<feFlood flood-color="${hex(e.color)}" flood-opacity="${unit(e.opacity)}" result="c${i}"/>`,
        `<feComposite in="c${i}" in2="${base}" operator="out" result="i${i}"/>`,
        `<feGaussianBlur in="i${i}" stdDeviation="${num(Math.max(0, e.blur) / 2)}" result="b${i}"/>`,
        `<feOffset in="b${i}" dx="${num(e.x)}" dy="${num(e.y)}" result="o${i}"/>`,
        `<feComposite in="o${i}" in2="SourceAlpha" operator="in" result="s${i}"/>`,
      );
      over.push(`s${i}`);
    }
  });
  // grain and mottling are drawn over the shape, only where the shape is
  list.forEach((e, i) => {
    if (e.type === "NOISE" || e.type === "TEXTURE") {
      const size = Math.max(0.5, Number.isFinite(e.size) ? e.size : 2);
      const density = Math.min(1, Math.max(0, Number.isFinite(e.density) ? e.density : 0.5));
      const strength = e.type === "NOISE" ? density * Math.min(1, Math.max(0, Number.isFinite(e.opacity) ? e.opacity : 0.25)) * 2 : density * 0.5;
      const freq = e.type === "NOISE" ? 1 / size : 0.4 / size;
      parts.push(
        `<feTurbulence type="fractalNoise" baseFrequency="${num(freq)}" numOctaves="${e.type === "NOISE" ? 2 : 4}" seed="${i + 1}" result="t${i}"/>`,
        `<feColorMatrix in="t${i}" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2 ${num(1 + strength)}" result="g${i}"/>`,
        `<feComposite in="g${i}" in2="SourceAlpha" operator="in" result="n${i}"/>`,
      );
      over.push(`n${i}`);
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

/** Rounded rectangle whose corner curves start earlier along the edges and hug the corner more, like Figma's corner smoothing. */
export function smoothedRectPath(w: number, h: number, r: [number, number, number, number], smooth: number): string {
  // Each curve starts p = r(1+smooth) from the corner (capped at half the side); its control points sit closer to the corner than a circle's.
  const k = 0.5523 + 0.2 * smooth;
  const ext = (v: number) => Math.min(Math.min(w, h) / 2, v * (1 + smooth));
  const [tl, tr, br, bl] = r.map((v) => (v > 0 ? ext(v) : 0)) as [number, number, number, number];
  return [
    `M${num(tl)} 0`,
    `H${num(w - tr)}`,
    tr > 0 ? `C${num(w - tr * (1 - k))} 0 ${num(w)} ${num(tr * (1 - k))} ${num(w)} ${num(tr)}` : "",
    `V${num(h - br)}`,
    br > 0 ? `C${num(w)} ${num(h - br * (1 - k))} ${num(w - br * (1 - k))} ${num(h)} ${num(w - br)} ${num(h)}` : "",
    `H${num(bl)}`,
    bl > 0 ? `C${num(bl * (1 - k))} ${num(h)} 0 ${num(h - bl * (1 - k))} 0 ${num(h - bl)}` : "",
    `V${num(tl)}`,
    tl > 0 ? `C0 ${num(tl * (1 - k))} ${num(tl * (1 - k))} 0 ${num(tl)} 0` : "",
    "Z",
  ].join("");
}

/** The outline of a rectangle-like or elliptical layer as one SVG shape element carrying `extra` attributes. */
export function shapeGeometry(n: DesignNode, extra: string): string {
  if (n.type === "ELLIPSE") return `<ellipse cx="${num(n.width / 2)}" cy="${num(n.height / 2)}" rx="${num(n.width / 2)}" ry="${num(n.height / 2)}"${extra}/>`;
  const r = cornerRadiiOf(n);
  const smooth = "cornerSmoothing" in n && typeof n.cornerSmoothing === "number" ? Math.min(1, Math.max(0, n.cornerSmoothing)) : 0;
  if (r && smooth > 0) return `<path d="${smoothedRectPath(n.width, n.height, r, smooth)}"${extra}/>`;
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

/** Size of one repeated picture in Tile mode: the picture's own size times `tileScale` (256 px when the size is unknown). */
export function tileSize(p: { imageWidth?: number; imageHeight?: number; tileScale?: number }): { w: number; h: number } {
  const ok = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : d);
  const scale = Math.min(10, Math.max(0.01, ok(p.tileScale, 1)));
  return { w: Math.max(1, ok(p.imageWidth, 256) * scale), h: Math.max(1, ok(p.imageHeight, 256) * scale) };
}

/**
 * The `<filter>` that applies image adjustments (exposure, contrast, saturation, temperature, tint, highlights, shadows: each -100 to 100) to a picture, or "" when there is nothing to adjust.
 * Exposure and contrast become one linear slope and intercept per colour channel; saturation is a colour matrix.
 */
export function imageAdjustFilter(id: string, adj: unknown): string {
  if (!adj || typeof adj !== "object") return "";
  const read = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.min(100, Math.max(-100, v)) : 0);
  const a = adj as Record<string, unknown>;
  const exposure = read(a.exposure);
  const contrast = read(a.contrast);
  const saturation = read(a.saturation);
  const temperature = read(a.temperature);
  const tint = read(a.tint);
  const highlights = read(a.highlights);
  const shadows = read(a.shadows);
  if (!exposure && !contrast && !saturation && !temperature && !tint && !highlights && !shadows) return "";
  const gain = 2 ** (exposure / 50);
  const factor = (100 + contrast) / 100;
  const intercept = num(0.5 - 0.5 * factor);
  // Temperature warms red and cools blue; tint pushes green against magenta.
  const channelGain: Record<string, number> = { R: 1 + 0.3 * (temperature / 100), G: 1 - 0.3 * (tint / 100), B: 1 - 0.3 * (temperature / 100) };
  const fn = ["R", "G", "B"].map((c) => `<feFunc${c} type="linear" slope="${num(gain * factor * channelGain[c]!, 1)}" intercept="${intercept}"/>`).join("");
  // Shadows lift or crush the dark end of the tone curve, highlights the bright end (a five point table).
  let tone = "";
  if (highlights || shadows) {
    const table = [0, 0.25, 0.5, 0.75, 1]
      .map((x) => num(Math.min(1, Math.max(0, x + 0.25 * (shadows / 100) * (1 - x) ** 2 + 0.25 * (highlights / 100) * x ** 2))))
      .join(" ");
    tone = `<feComponentTransfer>${["R", "G", "B"].map((c) => `<feFunc${c} type="table" tableValues="${table}"/>`).join("")}</feComponentTransfer>`;
  }
  return `<filter id="${id}" color-interpolation-filters="sRGB"><feComponentTransfer>${fn}</feComponentTransfer>${tone}${saturation ? `<feColorMatrix type="saturate" values="${num((100 + saturation) / 100, 1)}"/>` : ""}</filter>`;
}

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
        const filterId = `${gradientId}-adj`;
        const filter = imageAdjustFilter(filterId, fill.adjustments);
        const tile = fill.scaleMode === "TILE" ? tileSize(fill) : null;
        const pw = tile ? tile.w : n.width;
        const ph = tile ? tile.h : n.height;
        fillDef = `<pattern id="${gradientId}" patternUnits="userSpaceOnUse" width="${num(pw)}" height="${num(ph)}">${filter}<image href="${href.replace(/"/g, "&quot;")}" width="${num(pw)}" height="${num(ph)}" preserveAspectRatio="${tile ? "none" : par}"${filter ? ` filter="url(#${filterId})"` : ""}/></pattern>`;
        fillAttrs = ` fill="url(#${gradientId})" fill-opacity="${unit(fill.opacity)}"`;
      } else fillAttrs = ' fill="#e5e5e5"';
    } else if (fill.type === "GRADIENT_ANGULAR" || fill.type === "GRADIENT_DIAMOND") {
      out += steppedGradient(gradientId, fill, n.width, n.height, geometry(n, ""));
      return;
    } else {
      fillDef = gradientDef(gradientId, fill);
      fillAttrs = ` fill="url(#${gradientId})" fill-opacity="${unit(fill.opacity)}"`;
    }
    const blend = cssBlendMode(fill.blendMode);
    out += fillDef + geometry(n, blend ? `${fillAttrs} style="mix-blend-mode:${blend}"` : fillAttrs);
  });
  if (!strokes.length || !("strokeWidth" in n)) return out;

  const sides = "strokeSides" in n && Array.isArray(n.strokeSides) && n.strokeSides.length === 4 ? n.strokeSides.map((v) => Math.max(0, Number.isFinite(v) ? v : 0)) : null;
  if (sides) {
    // Figma's individual stroke weights: each side is an inside band of its own width, clipped to the rounded shape.
    const [t, r, b, l] = sides as [number, number, number, number];
    const sid = safeId(n.id);
    out += `<clipPath id="ss-${sid}">${geometry(n, "")}</clipPath>`;
    for (const stroke of strokes) {
      const fill = ` fill="${hex(paintColor(stroke))}" fill-opacity="${unit(stroke.opacity)}"`;
      const bands = [
        t > 0 ? `<rect x="0" y="0" width="${num(n.width)}" height="${num(t)}"${fill}/>` : "",
        r > 0 ? `<rect x="${num(n.width - r)}" y="0" width="${num(r)}" height="${num(n.height)}"${fill}/>` : "",
        b > 0 ? `<rect x="0" y="${num(n.height - b)}" width="${num(n.width)}" height="${num(b)}"${fill}/>` : "",
        l > 0 ? `<rect x="0" y="0" width="${num(l)}" height="${num(n.height)}"${fill}/>` : "",
      ].join("");
      out += `<g clip-path="url(#ss-${sid})">${bands}</g>`;
    }
    return out;
  }

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

/** Colour and opacity of a gradient at `t` (0..1), blended between the two stops around it. */
export function gradientAt(stops: { position: number; color: string; opacity: number }[], t: number): { color: string; opacity: number } {
  const list = [...stops].sort((a, b) => a.position - b.position);
  if (!list.length) return { color: "#000000", opacity: 1 };
  if (t <= list[0]!.position) return { color: hex(list[0]!.color), opacity: Number(unit(list[0]!.opacity)) };
  const last = list[list.length - 1]!;
  if (t >= last.position) return { color: hex(last.color), opacity: Number(unit(last.opacity)) };
  const i = list.findIndex((s) => s.position >= t);
  const a = list[i - 1]!;
  const b = list[i]!;
  const k = b.position === a.position ? 0 : (t - a.position) / (b.position - a.position);
  const rgb = (c: string) => {
    const h = hex(c).slice(1);
    const full = h.length <= 4 ? h.split("").map((x) => x + x).join("") : h;
    return [0, 2, 4].map((o) => parseInt(full.slice(o, o + 2), 16));
  };
  const ca = rgb(a.color);
  const cb = rgb(b.color);
  const mix = ca.map((v, n) => Math.round(v + (cb[n]! - v) * k));
  return { color: `#${mix.map((v) => v.toString(16).padStart(2, "0")).join("")}`, opacity: Number(unit(a.opacity)) + (Number(unit(b.opacity)) - Number(unit(a.opacity))) * k };
}

/**
 * Angular (conic) and diamond gradients have no SVG element, so they are drawn as many thin wedges or nested diamonds
 * clipped to the shape. `geometryMarkup` is the outline of the layer; the result is a self-contained group.
 */
export function steppedGradient(id: string, p: GradientPaint, w: number, h: number, geometryMarkup: string): string {
  const cx = w / 2;
  const cy = h / 2;
  const parts: string[] = [];
  if (p.type === "GRADIENT_ANGULAR") {
    const steps = 144;
    const radius = Math.hypot(w, h);
    const start = ((Number.isFinite(p.angle) ? p.angle : 0) * Math.PI) / 180;
    for (let i = 0; i < steps; i++) {
      const a0 = start + (i / steps) * Math.PI * 2;
      const a1 = start + ((i + 1.4) / steps) * Math.PI * 2; // a little overlap hides hairlines between wedges
      const c = gradientAt(p.stops, (i + 0.5) / steps);
      parts.push(`<path d="M${num(cx)} ${num(cy)}L${num(cx + Math.cos(a0) * radius)} ${num(cy + Math.sin(a0) * radius)}L${num(cx + Math.cos(a1) * radius)} ${num(cy + Math.sin(a1) * radius)}Z" fill="${c.color}" fill-opacity="${num(c.opacity)}"/>`);
    }
  } else {
    const steps = 64;
    for (let i = steps; i >= 1; i--) {
      const s = i / steps;
      const c = gradientAt(p.stops, s);
      parts.push(`<path d="M${num(cx - cx * s)} ${num(cy)}L${num(cx)} ${num(cy - cy * s)}L${num(cx + cx * s)} ${num(cy)}L${num(cx)} ${num(cy + cy * s)}Z" fill="${c.color}" fill-opacity="${num(c.opacity)}"/>`);
    }
    // outside the diamond, the colour of the last stop fills the corners
    const edge = gradientAt(p.stops, 1);
    parts.unshift(`<rect width="${num(w)}" height="${num(h)}" fill="${edge.color}" fill-opacity="${num(edge.opacity)}"/>`);
  }
  const clip = `sg-${id}`;
  return `<clipPath id="${clip}">${geometryMarkup}</clipPath><g clip-path="url(#${clip})" opacity="${unit(p.opacity)}">${parts.join("")}</g>`;
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

const isGradient = (p: Paint | undefined): p is GradientPaint => p?.type === "GRADIENT_LINEAR" || p?.type === "GRADIENT_RADIAL";

/** A text layer's first fill: the gradient definition it needs (empty for a plain colour) and the `fill` value to use. */
export function textFill(n: DesignNode): { defs: string; fill: string } {
  const p = "fills" in n ? n.fills?.[0] : undefined;
  if (isGradient(p)) {
    const id = `tg-${safeId(n.id)}`;
    return { defs: gradientDef(id, p), fill: `url(#${id})` };
  }
  return { defs: "", fill: p ? hex(paintColor(p)) : "none" };
}

const vectorGradientId = (n: DesignNode) => `vg-${safeId(n.id)}`;

/** True for a VECTOR drawn with the Line / Arrow / Polygon / Star tools: it has its own fill and stroke instead of baked-in markup attributes. */
export function isDrawnVector(n: DesignNode): boolean {
  return n.type === "VECTOR" && Array.isArray(n.fills);
}

/** Presentation attributes for the group around a drawn vector's markup (fill and stroke come from the layer). */
export function vectorPaintAttrs(n: DesignNode): string {
  if (n.type !== "VECTOR") return "";
  const fill = n.fills?.[0];
  const stroke = n.strokes?.[0];
  const parts = [fill ? `fill="${isGradient(fill) ? `url(#${vectorGradientId(n)})` : hex(paintColor(fill))}" fill-opacity="${unit(fill.opacity)}"` : 'fill="none"'];
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
  // a miter angle other than Figma's default 28.96 degrees becomes SVG's miter limit: 1 / sin(angle / 2)
  const angle = typeof n.strokeMiterAngle === "number" && Number.isFinite(n.strokeMiterAngle) ? Math.min(180, Math.max(1, n.strokeMiterAngle)) : undefined;
  const miterAttr = join === "MITER" && angle !== undefined && Math.abs(angle - 28.96) > 0.01 ? ` stroke-miterlimit="${num(1 / Math.sin((angle * Math.PI) / 360))}"` : "";
  return dashAttr + capAttr + joinAttr + miterAttr;
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
  if (n.type !== "VECTOR") return "";
  const fill = n.fills?.[0];
  const gradient = isGradient(fill) ? gradientDef(vectorGradientId(n), fill) : "";
  if (!n.strokes?.[0]) return gradient;
  const color = hex(paintColor(n.strokes[0]));
  // arrowheads grow with the stroke but are never smaller than 8 px
  const size = num(Math.max(8, 4 * Math.max(0, n.strokeWidth ?? 1)));
  const one = (side: "s" | "e", end: LineEnd | undefined) =>
    end && end !== "NONE" && end in MARKER_SHAPES
      ? `<marker id="${markerId(n, side)}" viewBox="0 0 10 10" refX="${end === "ARROW_LINES" ? 6 : 5}" refY="5" markerUnits="userSpaceOnUse" markerWidth="${size}" markerHeight="${size}" orient="auto-start-reverse" overflow="visible">${MARKER_SHAPES[end](color)}</marker>`
      : "";
  return gradient + one("s", n.strokeStartCap) + one("e", n.strokeEndCap);
}
