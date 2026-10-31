import { cssBlendMode, paintColor, type DesignNode, type Paint } from "@canvylo/types";

export type Language = "css" | "html" | "react" | "tailwind";
export type Decl = [prop: string, value: string];
export type ChildrenOf = (id: string) => DesignNode[];

const px = (n: number) => `${Math.round(n * 100) / 100}px`;

export function toRgba(hex: string, opacity = 1): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const v = parseInt(m[1]!, 16);
  const [r, g, b] = [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  return opacity >= 1 ? `#${m[1]!.toLowerCase()}` : `rgba(${r}, ${g}, ${b}, ${Math.round(opacity * 100) / 100})`;
}

/** CSS background value of a paint (solid colour or a linear/radial gradient). */
export function paintCss(p: Paint): string {
  if (p.type === "SOLID") return toRgba(p.color, p.opacity);
  if (p.type === "IMAGE") return `url(image) ${p.scaleMode === "STRETCH" ? "0 0 / 100% 100%" : `center / ${p.scaleMode === "FIT" ? "contain" : "cover"}`} no-repeat`;
  const stops = [...p.stops]
    .sort((a, b) => a.position - b.position)
    .map((s) => `${toRgba(s.color, s.opacity * p.opacity)} ${Math.round(s.position * 100)}%`)
    .join(", ");
  return p.type === "GRADIENT_RADIAL" ? `radial-gradient(circle, ${stops})` : `linear-gradient(${Math.round((p.angle + 90) * 100) / 100}deg, ${stops})`;
}

/** CSS `background` for fills stored bottom to top: CSS lists the top layer first, and a solid colour can only be the bottom layer. */
export function backgroundCss(fills: Paint[]): string {
  const top = [...fills].reverse();
  return top
    .map((p, i) => {
      const css = paintCss(p);
      return p.type === "SOLID" && i < top.length - 1 ? `linear-gradient(${css}, ${css})` : css;
    })
    .join(", ");
}

/** Computed style of one node as ordered CSS declarations. Children of a parent are placed absolutely. */
export function declarations(node: DesignNode, opts: { absolute?: boolean; hasChildren?: boolean; parentLayout?: "HORIZONTAL" | "VERTICAL" } = {}): Decl[] {
  const d: Decl[] = [];
  if (opts.absolute) d.push(["position", "absolute"], ["left", px(node.x)], ["top", px(node.y)]);
  else if (opts.hasChildren) d.push(["position", "relative"]);

  // A child of an auto layout frame that fills the container grows with flex instead of having a fixed size.
  const horizontal = opts.parentLayout === "HORIZONTAL";
  const inFlow = !!opts.parentLayout && node.layoutPositioning !== "ABSOLUTE";
  const fillWidth = inFlow && node.layoutSizingH === "FILL";
  const fillHeight = inFlow && node.layoutSizingV === "FILL";
  const growsMain = horizontal ? fillWidth : fillHeight;
  const stretches = horizontal ? fillHeight : fillWidth;
  if (!fillWidth) d.push(["width", px(node.width)]);
  if (!fillHeight) d.push(["height", px(node.height)]);
  if (growsMain) d.push(["flex", "1 1 0"]);
  if (stretches) d.push(["align-self", "stretch"]);
  const flips = `${node.flipX ? " scaleX(-1)" : ""}${node.flipY ? " scaleY(-1)" : ""}`;
  if (node.rotation || flips) d.push(["transform", `${node.rotation ? `rotate(${node.rotation}deg)` : ""}${flips}`.trim()]);
  if (node.opacity !== 1) d.push(["opacity", String(Math.round(node.opacity * 100) / 100)]);
  const blendMode = cssBlendMode(node.blendMode);
  if (blendMode) d.push(["mix-blend-mode", blendMode]);

  const fx = (node.effects ?? []).filter((e) => e.visible);
  const shadows = fx.flatMap((e) => (e.type === "LAYER_BLUR" ? [] : [`${e.type === "INNER_SHADOW" ? "inset " : ""}${px(e.x)} ${px(e.y)} ${px(e.blur)} ${toRgba(e.color, e.opacity)}`]));
  const blur = fx.find((e) => e.type === "LAYER_BLUR");
  const effectDecls = (): void => {
    if (shadows.length) d.push(["box-shadow", shadows.join(", ")]);
    if (blur && blur.type === "LAYER_BLUR") d.push(["filter", `blur(${px(blur.radius)})`]);
  };

  if (node.type === "TEXT") {
    const fill = node.fills[0];
    if (fill) d.push(["color", toRgba(paintColor(fill), fill.opacity)]);
    d.push(["font-family", node.fontFamily], ["font-size", px(node.fontSize)], ["font-weight", String(node.fontWeight)]);
    d.push(["line-height", node.lineHeight === "AUTO" ? "normal" : px(node.lineHeight)]);
    if (node.letterSpacing) d.push(["letter-spacing", px(node.letterSpacing)]);
    if (node.italic) d.push(["font-style", "italic"]);
    if (node.textDecoration === "UNDERLINE") d.push(["text-decoration", "underline"]);
    else if (node.textDecoration === "STRIKETHROUGH") d.push(["text-decoration", "line-through"]);
    if (node.textCase === "UPPER") d.push(["text-transform", "uppercase"]);
    else if (node.textCase === "LOWER") d.push(["text-transform", "lowercase"]);
    else if (node.textCase === "TITLE") d.push(["text-transform", "capitalize"]);
    if (node.textVerticalAlign === "CENTER" || node.textVerticalAlign === "BOTTOM") {
      d.push(["display", "flex"], ["align-items", node.textVerticalAlign === "CENTER" ? "center" : "flex-end"]);
    }
    d.push(["text-align", node.textAlign.toLowerCase()]);
    if (node.characters.includes("\n") || (node.textAutoResize ?? "WIDTH_AND_HEIGHT") !== "WIDTH_AND_HEIGHT") d.push(["white-space", "pre-wrap"]);
    effectDecls();
    return d;
  }

  if ("fills" in node && node.fills?.length) d.push(["background", backgroundCss(node.fills)]);
  if (node.type === "ELLIPSE") d.push(["border-radius", "50%"]);
  else if ("cornerRadii" in node && node.cornerRadii?.length === 4 && node.cornerRadii.some((r) => r > 0)) d.push(["border-radius", node.cornerRadii.map(px).join(" ")]);
  else if ("cornerRadius" in node && node.cornerRadius > 0) d.push(["border-radius", px(node.cornerRadius)]);
  if ("strokes" in node && node.strokes?.[0] && node.strokeWidth !== undefined) {
    d.push(["box-sizing", "border-box"], ["border", `${px(node.strokeWidth)} solid ${toRgba(paintColor(node.strokes[0]), node.strokes[0].opacity)}`]);
    if ("strokeSides" in node && node.strokeSides?.length === 4) d.push(["border-width", node.strokeSides.map(px).join(" ")]);
    if (node.strokeDash?.some((v) => v > 0)) d.push(["border-style", (node.strokeDash[0] ?? 0) <= node.strokeWidth ? "dotted" : "dashed"]);
  }
  if (node.type === "FRAME" && node.clipsContent) d.push(["overflow", "hidden"]);
  if (node.type === "FRAME" && (node.layoutMode === "HORIZONTAL" || node.layoutMode === "VERTICAL")) {
    // Auto layout is a flex container; its children are in the flow instead of absolutely positioned.
    const justify = { MIN: "flex-start", CENTER: "center", MAX: "flex-end", SPACE_BETWEEN: "space-between" } as const;
    d.push(["display", "flex"], ["flex-direction", node.layoutMode === "HORIZONTAL" ? "row" : "column"]);
    if (node.layoutWrap) {
      // wrapped lines are spaced by the line gap: row-gap / column-gap swap with the direction
      const along = px(node.itemSpacing ?? 0);
      const between = px(node.counterSpacing ?? node.itemSpacing ?? 0);
      d.push(["flex-wrap", "wrap"], ["gap", node.layoutMode === "HORIZONTAL" ? `${between} ${along}` : `${along} ${between}`]);
    } else if (node.itemSpacing) d.push(["gap", px(node.itemSpacing)]);
    const pad = [node.paddingTop, node.paddingRight, node.paddingBottom, node.paddingLeft].map((v) => v ?? 0);
    if (pad.some((v) => v > 0)) d.push(["padding", pad.map(px).join(" ")]);
    d.push(["justify-content", justify[node.primaryAxisAlign ?? "MIN"]], ["align-items", justify[node.counterAxisAlign ?? "MIN"]]);
  }
  effectDecls();
  return d;
}

const tw = (s: string) => s.replace(/\s+/g, "_");

/** Map one declaration to a Tailwind utility (arbitrary values where there is no preset). */
export function tailwindClass([prop, value]: Decl): string {
  switch (prop) {
    case "position":
      return value;
    case "left":
    case "top":
    case "width":
    case "height":
      return `${{ left: "left", top: "top", width: "w", height: "h" }[prop]}-[${value}]`;
    case "transform":
      return `rotate-[${value.slice(7, -1)}]`;
    case "opacity":
      return `opacity-[${value}]`;
    case "background":
      return `bg-[${tw(value)}]`;
    case "border-radius":
      return value === "50%" ? "rounded-full" : `rounded-[${tw(value)}]`;
    case "box-sizing":
      return "box-border";
    case "border": {
      const [w, , ...color] = value.split(" ");
      return `border-[${w}] border-solid border-[${tw(color.join(" "))}]`;
    }
    case "overflow":
      return "overflow-hidden";
    case "color":
      return `text-[${tw(value)}]`;
    case "font-family":
      return `font-['${value.split(",")[0]!.trim().replace(/['"]/g, "").replace(/\s+/g, "_")}']`;
    case "font-size":
      return `text-[${value}]`;
    case "font-weight":
      return `font-[${value}]`;
    case "line-height":
      return value === "normal" ? "leading-normal" : `leading-[${value}]`;
    case "letter-spacing":
      return `tracking-[${value}]`;
    case "text-align":
      return `text-${value}`;
    default:
      return `[${prop}:${tw(value)}]`;
  }
}

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "node";
const pascal = (name: string) => name.replace(/[^a-zA-Z0-9]+/g, " ").trim().split(" ").map((w) => w[0]!.toUpperCase() + w.slice(1)).join("") || "Component";
const camel = (prop: string) => prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
const escHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escJsx = (s: string) => escHtml(s).replace(/[{}]/g, (c) => (c === "{" ? "&#123;" : "&#125;"));

interface Walked {
  node: DesignNode;
  cls: string;
  decls: Decl[];
  kids: Walked[];
}

function walk(node: DesignNode, children: ChildrenOf, absolute: boolean, used: Map<string, number>, parentLayout?: "HORIZONTAL" | "VERTICAL"): Walked {
  const kids = children(node.id).filter((c) => c.visible);
  const base = slug(node.type === "TEXT" ? node.characters : node.name);
  const n = (used.get(base) ?? 0) + 1;
  used.set(base, n);
  return {
    node,
    cls: n === 1 ? base : `${base}-${n}`,
    decls: declarations(node, { absolute, hasChildren: kids.length > 0, parentLayout }),
    kids: kids.map((k) => walk(k, children, k.layoutPositioning === "ABSOLUTE" || !(node.type === "FRAME" && (node.layoutMode === "HORIZONTAL" || node.layoutMode === "VERTICAL")), used, node.type === "FRAME" && (node.layoutMode === "HORIZONTAL" || node.layoutMode === "VERTICAL") ? node.layoutMode : undefined)),
  };
}

function css(w: Walked): string {
  const rule = `.${w.cls} {\n${w.decls.map(([p, v]) => `  ${p}: ${v};`).join("\n")}\n}`;
  return [rule, ...w.kids.map(css)].join("\n\n");
}

function html(w: Walked, depth: number, classOf: (w: Walked) => string): string {
  const pad = "  ".repeat(depth);
  const tag = w.node.type === "TEXT" ? "p" : "div";
  const open = `${pad}<${tag} class="${classOf(w)}">`;
  if (w.node.type === "TEXT") return `${open}${escHtml(w.node.characters)}</${tag}>`;
  if (!w.kids.length) return `${open}</${tag}>`;
  return `${open}\n${w.kids.map((k) => html(k, depth + 1, classOf)).join("\n")}\n${pad}</${tag}>`;
}

function jsx(w: Walked, depth: number): string {
  const pad = "  ".repeat(depth);
  const tag = w.node.type === "TEXT" ? "p" : "div";
  const style = w.decls.map(([p, v]) => `${camel(p)}: ${JSON.stringify(v)}`).join(", ");
  const open = `${pad}<${tag} style={{ ${style} }}>`;
  if (w.node.type === "TEXT") return `${open}${escJsx(w.node.characters)}</${tag}>`;
  if (!w.kids.length) return `${pad}<${tag} style={{ ${style} }} />`;
  return `${open}\n${w.kids.map((k) => jsx(k, depth + 1)).join("\n")}\n${pad}</${tag}>`;
}

/** Generate code for a node and its visible descendants in the requested language. */
export function generateCode(node: DesignNode, children: ChildrenOf, language: Language): string {
  const root = walk(node, children, false, new Map());
  switch (language) {
    case "css":
      return css(root);
    case "html":
      return `${html(root, 0, (w) => w.cls)}\n\n<style>\n${css(root)}\n</style>`;
    case "tailwind":
      return html(root, 0, (w) => w.decls.map(tailwindClass).join(" "));
    case "react":
      return `export function ${pascal(node.name)}() {\n  return (\n${jsx(root, 2)}\n  );\n}`;
  }
}
