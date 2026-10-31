import type { ClipNode } from "./clipboard";

/**
 * SVG text -> Farsha layers. The SVG is parsed by a small tolerant reader (no DOM, no scripts):
 * rect, circle, ellipse and text become native layers; path, polygon, polyline and line become VECTOR
 * layers whose markup is rebuilt from an allow-list of attributes. Everything else is dropped.
 */

interface XmlNode {
  tag: string;
  attrs: Record<string, string>;
  children: XmlNode[];
  text: string;
}

const MAX_ELEMENTS = 2000;
const MAX_PATH = 200_000;
const PATH_RE = /^[MmLlHhVvCcSsQqTtAaZz0-9eE+\-.,\s]*$/;
const POINTS_RE = /^[0-9eE+\-.,\s]*$/;

const decode = (s: string) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e: string) => {
    const k = e.toLowerCase();
    if (k === "amp") return "&";
    if (k === "lt") return "<";
    if (k === "gt") return ">";
    if (k === "quot") return '"';
    if (k === "apos") return "'";
    const code = k.startsWith("#x") ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10);
    return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : "";
  });

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** True for text that is an SVG document (what you get from "Copy as SVG" or an icon's markup). */
export function looksLikeSvg(text: string): boolean {
  return /^\s*(?:<\?xml[^>]*>\s*)?(?:<!--[\s\S]*?-->\s*)*(?:<!DOCTYPE[^>]*>\s*)?<svg[\s>]/i.test(text);
}

function parseAttrs(src: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of src.matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)) {
    out[m[1]!.toLowerCase()] = decode(m[2] ?? m[3] ?? m[4] ?? "");
  }
  return out;
}

/** Parse markup into a tree and return the first <svg> element. */
export function parseSvg(src: string): XmlNode | null {
  const cleaned = src
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\?[\s\S]*?\?>/g, "")
    .replace(/<!DOCTYPE[^>]*>/gi, "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, (_, t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;"));
  const root: XmlNode = { tag: "#root", attrs: {}, children: [], text: "" };
  const stack: XmlNode[] = [root];
  const token = /<(\/?)([A-Za-z][\w:.-]*)((?:\s+[^\s=/>]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?)*)\s*(\/?)>|([^<]+)/g;
  let count = 0;
  for (const m of cleaned.matchAll(token)) {
    if (m[5] !== undefined) {
      stack[stack.length - 1]!.text += decode(m[5]);
      continue;
    }
    const tag = m[2]!.toLowerCase();
    if (m[1]) {
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i]!.tag === tag) {
          stack.length = i;
          break;
        }
      }
      continue;
    }
    if (++count > MAX_ELEMENTS * 4) return null;
    const node: XmlNode = { tag, attrs: parseAttrs(m[3] ?? ""), children: [], text: "" };
    stack[stack.length - 1]!.children.push(node);
    if (!m[4]) stack.push(node);
  }
  return root.children.find((c) => c.tag === "svg") ?? null;
}

// ---------- colour ----------

const NAMED: Record<string, string> = {
  black: "#000000", white: "#ffffff", red: "#ff0000", green: "#008000", blue: "#0000ff", yellow: "#ffff00",
  gray: "#808080", grey: "#808080", orange: "#ffa500", purple: "#800080", pink: "#ffc0cb", cyan: "#00ffff", magenta: "#ff00ff",
};

const hex2 = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");

interface Color {
  color: string;
  opacity: number;
}

/** CSS colour -> hex + opacity. null means "no paint" (none / transparent). */
export function parseColor(value: string, current = "#000000", gradients: Map<string, Color> = new Map()): Color | null {
  const v = value.trim().toLowerCase();
  if (!v || v === "none" || v === "transparent") return null;
  if (v === "currentcolor") return parseColor(current, "#000000", gradients);
  const url = /^url\(\s*['"]?#([^'")\s]+)['"]?\s*\)/.exec(v);
  if (url) return gradients.get(url[1]!) ?? { color: "#808080", opacity: 1 };
  let m = /^#([0-9a-f]{3})$/.exec(v);
  if (m) return { color: "#" + [...m[1]!].map((c) => c + c).join(""), opacity: 1 };
  m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/.exec(v);
  if (m) return { color: "#" + m[1], opacity: m[2] ? parseInt(m[2], 16) / 255 : 1 };
  m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/.exec(v);
  if (m) {
    const a = m[4] ? (m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4])) : 1;
    return { color: "#" + hex2(+m[1]!) + hex2(+m[2]!) + hex2(+m[3]!), opacity: Math.max(0, Math.min(1, a)) };
  }
  if (NAMED[v]) return { color: NAMED[v]!, opacity: 1 };
  return { color: "#000000", opacity: 1 };
}

// ---------- inherited style ----------

interface Ctx {
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  fillOpacity: number;
  strokeOpacity: number;
  color: string;
  tx: number;
  ty: number;
  fontSize: number;
  fontWeight: number;
  fontFamily: string;
  anchor: string;
  linecap: string;
  linejoin: string;
  fillRule: string;
}

const BASE: Ctx = {
  fill: "black", stroke: "none", strokeWidth: 1, opacity: 1, fillOpacity: 1, strokeOpacity: 1, color: "#000000",
  tx: 0, ty: 0, fontSize: 16, fontWeight: 400, fontFamily: "Inter, system-ui, sans-serif", anchor: "start",
  linecap: "", linejoin: "", fillRule: "",
};

function styleMap(el: XmlNode): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (el.attrs.style ?? "").split(";")) {
    const i = part.indexOf(":");
    if (i > 0) out[part.slice(0, i).trim().toLowerCase()] = part.slice(i + 1).trim();
  }
  return out;
}

const len = (v: string | undefined, fallback = 0): number => {
  if (v === undefined) return fallback;
  const n = parseFloat(v);
  return Number.isFinite(n) && !v.trim().endsWith("%") ? n : fallback;
};

/** Only pure translations are supported; rotate / scale / skew are ignored. */
function translation(transform: string | undefined): { x: number; y: number } {
  if (!transform) return { x: 0, y: 0 };
  const t = /translate\(\s*([-\d.e]+)(?:[\s,]+([-\d.e]+))?\s*\)/i.exec(transform);
  if (t) return { x: parseFloat(t[1]!), y: t[2] ? parseFloat(t[2]) : 0 };
  const m = /matrix\(\s*1[\s,]+0[\s,]+0[\s,]+1[\s,]+([-\d.e]+)[\s,]+([-\d.e]+)\s*\)/i.exec(transform);
  return m ? { x: parseFloat(m[1]!), y: parseFloat(m[2]!) } : { x: 0, y: 0 };
}

const weight = (v: string | undefined, fallback: number): number => (v === "bold" ? 700 : v === "normal" ? 400 : len(v, fallback));

function inherit(el: XmlNode, ctx: Ctx): Ctx {
  const st = styleMap(el);
  const get = (name: string) => st[name] ?? el.attrs[name];
  const tr = translation(el.attrs.transform);
  return {
    fill: get("fill") ?? ctx.fill,
    stroke: get("stroke") ?? ctx.stroke,
    strokeWidth: len(get("stroke-width"), ctx.strokeWidth),
    opacity: ctx.opacity * len(get("opacity"), 1),
    fillOpacity: len(get("fill-opacity"), ctx.fillOpacity),
    strokeOpacity: len(get("stroke-opacity"), ctx.strokeOpacity),
    color: get("color") ?? ctx.color,
    tx: ctx.tx + tr.x,
    ty: ctx.ty + tr.y,
    fontSize: len(get("font-size"), ctx.fontSize),
    fontWeight: weight(get("font-weight"), ctx.fontWeight),
    fontFamily: get("font-family")?.split(",")[0]?.replace(/['"]/g, "").trim() || ctx.fontFamily,
    anchor: get("text-anchor") ?? ctx.anchor,
    linecap: get("stroke-linecap") ?? ctx.linecap,
    linejoin: get("stroke-linejoin") ?? ctx.linejoin,
    fillRule: get("fill-rule") ?? ctx.fillRule,
  };
}

// ---------- conversion ----------

type Paint = { type: "SOLID"; color: string; opacity: number };

function textOf(el: XmlNode): string {
  return (el.text + el.children.map(textOf).join("")).replace(/\s+/g, " ").trim();
}

function collectGradients(root: XmlNode): Map<string, Color> {
  const map = new Map<string, Color>();
  const walk = (n: XmlNode) => {
    if ((n.tag === "lineargradient" || n.tag === "radialgradient") && n.attrs.id) {
      const stop = n.children.find((c) => c.tag === "stop");
      if (stop) {
        const st = styleMap(stop);
        const c = parseColor(st["stop-color"] ?? stop.attrs["stop-color"] ?? "#000000");
        if (c) map.set(n.attrs.id, { color: c.color, opacity: c.opacity * len(st["stop-opacity"] ?? stop.attrs["stop-opacity"], 1) });
      }
    }
    n.children.forEach(walk);
  };
  walk(root);
  return map;
}

/** Convert SVG text to one FRAME clip containing the converted shapes; null if nothing usable is in it. */
export function svgToClip(source: string): ClipNode | null {
  const svg = parseSvg(source);
  if (!svg) return null;

  const vb = (svg.attrs.viewbox ?? "").split(/[\s,]+/).map(Number);
  const hasVb = vb.length === 4 && vb.every(Number.isFinite) && vb[2]! > 0 && vb[3]! > 0;
  const W0 = len(svg.attrs.width, hasVb ? vb[2]! : 100);
  const H0 = len(svg.attrs.height, hasVb ? vb[3]! : 100);
  const [vx, vy, vw, vh] = hasVb ? (vb as [number, number, number, number]) : [0, 0, W0, H0];
  const W = W0 > 0 ? W0 : vw;
  const H = H0 > 0 ? H0 : vh;
  const s = Math.min(W / vw, H / vh);
  const ox = (W - vw * s) / 2;
  const oy = (H - vh * s) / 2;
  const gradients = collectGradients(svg);

  const X = (x: number, c: Ctx) => (x + c.tx - vx) * s + ox;
  const Y = (y: number, c: Ctx) => (y + c.ty - vy) * s + oy;

  const fills = (c: Ctx): Paint[] => {
    const p = parseColor(c.fill, c.color, gradients);
    return p ? [{ type: "SOLID", color: p.color, opacity: p.opacity * c.fillOpacity }] : [];
  };
  const strokes = (c: Ctx): Paint[] => {
    const p = parseColor(c.stroke, c.color, gradients);
    return p ? [{ type: "SOLID", color: p.color, opacity: p.opacity * c.strokeOpacity }] : [];
  };
  const common = (c: Ctx) => ({ fills: fills(c), strokes: strokes(c), strokeWidth: c.strokeWidth * s, opacity: c.opacity });

  const vector = (el: XmlNode, c: Ctx): ClipNode | null => {
    let shape: string;
    if (el.tag === "path") {
      const d = el.attrs.d ?? "";
      if (!d || d.length > MAX_PATH || !PATH_RE.test(d)) return null;
      shape = `<path d="${esc(d)}"`;
    } else if (el.tag === "polygon" || el.tag === "polyline") {
      const pts = el.attrs.points ?? "";
      if (!pts || pts.length > MAX_PATH || !POINTS_RE.test(pts)) return null;
      shape = `<${el.tag} points="${esc(pts)}"`;
    } else {
      const [x1, y1, x2, y2] = ["x1", "y1", "x2", "y2"].map((k) => len(el.attrs[k]));
      shape = `<path d="M${x1} ${y1}L${x2} ${y2}"`;
    }
    const fill = el.tag === "line" ? null : parseColor(c.fill, c.color, gradients);
    const stroke = parseColor(c.stroke, c.color, gradients);
    const attrs = [
      `fill="${fill ? fill.color : "none"}"`,
      fill && fill.opacity * c.fillOpacity !== 1 ? `fill-opacity="${+(fill.opacity * c.fillOpacity).toFixed(3)}"` : "",
      stroke ? `stroke="${stroke.color}" stroke-width="${c.strokeWidth}"` : "",
      stroke && stroke.opacity * c.strokeOpacity !== 1 ? `stroke-opacity="${+(stroke.opacity * c.strokeOpacity).toFixed(3)}"` : "",
      /^(butt|round|square)$/.test(c.linecap) ? `stroke-linecap="${c.linecap}"` : "",
      /^(miter|round|bevel)$/.test(c.linejoin) ? `stroke-linejoin="${c.linejoin}"` : "",
      /^(nonzero|evenodd)$/.test(c.fillRule) ? `fill-rule="${c.fillRule}"` : "",
      c.tx || c.ty ? `transform="translate(${c.tx} ${c.ty})"` : "",
    ].filter(Boolean);
    return {
      type: "VECTOR",
      props: { name: "Vector", x: ox, y: oy, width: vw * s, height: vh * s, viewBox: `${vx} ${vy} ${vw} ${vh}`, markup: `${shape} ${attrs.join(" ")}/>`, opacity: c.opacity },
      children: [],
    };
  };

  let budget = MAX_ELEMENTS;
  const convert = (el: XmlNode, parent: Ctx, out: ClipNode[]) => {
    if (budget-- <= 0) return;
    const c = inherit(el, parent);
    switch (el.tag) {
      case "g":
      case "svg":
      case "a":
        el.children.forEach((k) => convert(k, c, out));
        return;
      case "rect": {
        const w = len(el.attrs.width) * s;
        const h = len(el.attrs.height) * s;
        if (w <= 0 || h <= 0) return;
        const rx = len(el.attrs.rx, len(el.attrs.ry)) * s;
        out.push({ type: "RECTANGLE", props: { name: "Rectangle", x: X(len(el.attrs.x), c), y: Y(len(el.attrs.y), c), width: w, height: h, cornerRadius: Math.min(rx, w / 2, h / 2), ...common(c) }, children: [] });
        return;
      }
      case "circle":
      case "ellipse": {
        const rx = len(el.attrs.r, len(el.attrs.rx)) * s;
        const ry = len(el.attrs.r, len(el.attrs.ry)) * s;
        if (rx <= 0 || ry <= 0) return;
        out.push({ type: "ELLIPSE", props: { name: "Ellipse", x: X(len(el.attrs.cx), c) - rx, y: Y(len(el.attrs.cy), c) - ry, width: rx * 2, height: ry * 2, ...common(c) }, children: [] });
        return;
      }
      case "text": {
        const characters = textOf(el);
        if (!characters) return;
        const size = c.fontSize * s;
        const width = Math.max(8, characters.length * size * 0.56);
        const bx = X(len(el.attrs.x), c);
        const left = c.anchor === "middle" ? bx - width / 2 : c.anchor === "end" ? bx - width : bx;
        const align = c.anchor === "middle" ? "CENTER" : c.anchor === "end" ? "RIGHT" : "LEFT";
        out.push({
          type: "TEXT",
          props: { name: characters.slice(0, 40), characters, x: left, y: Y(len(el.attrs.y), c) - size, width, height: size * 1.4, fontSize: size, fontWeight: c.fontWeight, fontFamily: c.fontFamily, textAlign: align, fills: fills(c), opacity: c.opacity },
          children: [],
        });
        return;
      }
      case "path":
      case "polygon":
      case "polyline":
      case "line": {
        const v = vector(el, c);
        if (v) out.push(v);
        return;
      }
      default:
        return; // defs, style, script, image, use, filters ... are never imported
    }
  };

  const children: ClipNode[] = [];
  svg.children.forEach((k) => convert(k, inherit(svg, BASE), children));
  if (!children.length) return null;
  return {
    type: "FRAME",
    props: { name: "SVG", x: 0, y: 0, width: W, height: H, fills: [], strokes: [], strokeWidth: 1, cornerRadius: 0, clipsContent: false },
    children,
  };
}
