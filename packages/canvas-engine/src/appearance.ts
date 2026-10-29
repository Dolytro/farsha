import type { DesignNode, Effect } from "@canvylo/types";

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

function geometry(n: DesignNode, extra: string): string {
  if (n.type === "ELLIPSE") return `<ellipse cx="${num(n.width / 2)}" cy="${num(n.height / 2)}" rx="${num(n.width / 2)}" ry="${num(n.height / 2)}"${extra}/>`;
  const r = "cornerRadius" in n && n.cornerRadius > 0 ? ` rx="${num(n.cornerRadius)}"` : "";
  return `<rect width="${num(n.width)}" height="${num(n.height)}"${r}${extra}/>`;
}

/** Fill and stroke of a rectangle, frame or ellipse. Inside/outside strokes are clipped/masked double-width strokes. */
export function shapeMarkup(n: DesignNode): string {
  const fill = "fills" in n ? n.fills[0] : undefined;
  const stroke = "strokes" in n ? n.strokes[0] : undefined;
  const fillAttrs = fill ? ` fill="${hex(fill.color)}" fill-opacity="${unit(fill.opacity)}"` : ' fill="none"';
  let out = geometry(n, fillAttrs);
  if (!stroke || !("strokeWidth" in n)) return out;

  const w = Math.max(0, n.strokeWidth);
  const id = safeId(n.id);
  const base = ` fill="none" stroke="${hex(stroke.color)}" stroke-opacity="${unit(stroke.opacity)}"`;
  const align = "strokeAlign" in n && n.strokeAlign ? n.strokeAlign : "CENTER";
  if (align === "INSIDE") {
    out += `<clipPath id="sc-${id}">${geometry(n, "")}</clipPath>` + geometry(n, `${base} stroke-width="${num(w * 2)}" clip-path="url(#sc-${id})"`);
  } else if (align === "OUTSIDE") {
    out +=
      `<mask id="sm-${id}" maskUnits="userSpaceOnUse" x="${num(-w)}" y="${num(-w)}" width="${num(n.width + w * 2)}" height="${num(n.height + w * 2)}">` +
      `<rect x="${num(-w)}" y="${num(-w)}" width="${num(n.width + w * 2)}" height="${num(n.height + w * 2)}" fill="#fff"/>${geometry(n, ' fill="#000"')}</mask>` +
      geometry(n, `${base} stroke-width="${num(w * 2)}" mask="url(#sm-${id})"`);
  } else {
    out += geometry(n, `${base} stroke-width="${num(w)}"`);
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
