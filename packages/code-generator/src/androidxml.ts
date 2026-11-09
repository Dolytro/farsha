import { paintColor, type DesignNode, type Paint } from "@farsha/types";

type ChildrenOf = (id: string) => DesignNode[];
type ColourPaint = Exclude<Paint, { type: "IMAGE" }>;

const r2 = (n: number) => String(Math.round(n * 100) / 100);
const dp = (n: number) => `${r2(n)}dp`;
const snake = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").replace(/^([0-9])/, "_$1") || "layer";
const xmlAttr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "&#10;");
const NS = 'xmlns:android="http://schemas.android.com/apk/res/android"';

/** `#AARRGGBB` for a hex colour (black when it is not a plain 6 digit hex), the way Android resources write colours. */
export function androidColor(hex: string, opacity = 1): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  const alpha = Math.round(Math.min(1, Math.max(0, opacity)) * 255);
  return `#${alpha.toString(16).padStart(2, "0").toUpperCase()}${(m ? m[1]! : "000000").toUpperCase()}`;
}

function topFill(node: DesignNode): ColourPaint | undefined {
  return "fills" in node ? [...(node.fills ?? [])].reverse().find((f): f is ColourPaint => f.type !== "IMAGE") : undefined;
}

/** The angle Android's gradient understands: a multiple of 45 degrees, 0 = left to right, 90 = bottom to top. */
function gradientAngle(p: Extract<ColourPaint, { type: "GRADIENT_LINEAR" | "GRADIENT_RADIAL" | "GRADIENT_ANGULAR" | "GRADIENT_DIAMOND" }>): number {
  // Farsha: 0 = left to right, 90 = top to bottom. Android turns the other way.
  const a = (((360 - p.angle) % 360) + 360) % 360;
  return (Math.round(a / 45) * 45) % 360;
}

interface Drawable {
  name: string;
  xml: string;
}

/** The `<shape>` drawable of a layer, or null when it has no fill, border or rounded corner to draw. */
function shapeDrawable(node: DesignNode, name: string): Drawable | null {
  const fill = topFill(node);
  const stroke = "strokes" in node ? node.strokes?.[0] : undefined;
  const radii = "cornerRadii" in node && node.cornerRadii?.length === 4 && node.cornerRadii.some((r) => r > 0) ? node.cornerRadii : null;
  const radius = "cornerRadius" in node ? node.cornerRadius : 0;
  const hasStroke = !!stroke && "strokeWidth" in node && !!node.strokeWidth;
  if (!fill && !hasStroke) return null;
  const body: string[] = [];
  if (fill && fill.type === "SOLID") body.push(`    <solid android:color="${androidColor(fill.color, fill.opacity)}" />`);
  else if (fill) {
    const stops = [...fill.stops].sort((a, b) => a.position - b.position);
    const first = stops[0];
    const last = stops[stops.length - 1];
    if (first && last) {
      const center = stops.length > 2 ? stops[Math.floor(stops.length / 2)] : undefined;
      const type = fill.type === "GRADIENT_RADIAL" || fill.type === "GRADIENT_DIAMOND" ? "radial" : fill.type === "GRADIENT_ANGULAR" ? "sweep" : "linear";
      body.push(
        `    <gradient android:type="${type}" android:startColor="${androidColor(first.color, first.opacity * fill.opacity)}"${center ? ` android:centerColor="${androidColor(center.color, center.opacity * fill.opacity)}"` : ""} android:endColor="${androidColor(last.color, last.opacity * fill.opacity)}"${type === "linear" ? ` android:angle="${gradientAngle(fill)}"` : type === "radial" ? ` android:gradientRadius="${r2(Math.max(node.width, node.height) / 2)}dp"` : ""} />`,
      );
    }
  }
  if (hasStroke && stroke && "strokeWidth" in node) {
    const dash = node.strokeDash?.some((v) => v > 0) ? ` android:dashWidth="${dp(node.strokeDash[0] ?? 0)}" android:dashGap="${dp(node.strokeDash[1] ?? node.strokeDash[0] ?? 0)}"` : "";
    body.push(`    <stroke android:width="${dp(node.strokeWidth ?? 1)}" android:color="${androidColor(paintColor(stroke), stroke.opacity)}"${dash} />`);
  }
  if (node.type !== "ELLIPSE") {
    if (radii && new Set(radii).size > 1) body.push(`    <corners android:topLeftRadius="${dp(radii[0]!)}" android:topRightRadius="${dp(radii[1]!)}" android:bottomRightRadius="${dp(radii[2]!)}" android:bottomLeftRadius="${dp(radii[3]!)}" />`);
    else if (radii || radius > 0) body.push(`    <corners android:radius="${dp(radii ? radii[0]! : radius)}" />`);
  }
  const kind = node.type === "ELLIPSE" ? "oval" : "rectangle";
  return { name, xml: `<!-- res/drawable/${name}.xml -->\n<shape ${NS} android:shape="${kind}">\n${body.join("\n")}\n</shape>` };
}

const WEIGHT_STYLE = (w: number) => (w >= 600 ? "bold" : undefined);

class Namer {
  private used = new Map<string, number>();
  next(name: string): string {
    const base = snake(name);
    const n = (this.used.get(base) ?? 0) + 1;
    this.used.set(base, n);
    return n === 1 ? base : `${base}_${n}`;
  }
}

interface Ctx {
  /** The parent is a LinearLayout: gaps come from margins on the second and later children. */
  linear?: { horizontal: boolean; gap: number; index: number };
  /** The parent is a FrameLayout: every child is placed with margins. */
  framed: boolean;
}

function element(node: DesignNode, children: ChildrenOf, ctx: Ctx, namer: Namer, drawables: Drawable[], depth: number): string {
  const pad = "    ".repeat(depth);
  const attrs: string[] = [];
  const kids = children(node.id).filter((c) => c.visible);
  const inFlow = !!ctx.linear && node.layoutPositioning !== "ABSOLUTE";
  const fillW = inFlow && node.layoutSizingH === "FILL";
  const fillH = inFlow && node.layoutSizingV === "FILL";
  const size = (w: string, h: string) => attrs.push(`android:layout_width="${w}"`, `android:layout_height="${h}"`);
  const margins = () => {
    if (inFlow && ctx.linear) {
      if (ctx.linear.index > 0 && ctx.linear.gap > 0) attrs.push(`android:${ctx.linear.horizontal ? "layout_marginStart" : "layout_marginTop"}="${dp(ctx.linear.gap)}"`);
    } else if (ctx.framed) {
      if (node.x) attrs.push(`android:layout_marginStart="${dp(node.x)}"`);
      if (node.y) attrs.push(`android:layout_marginTop="${dp(node.y)}"`);
      attrs.push('android:layout_gravity="top|start"');
    }
  };
  const look = (name: string) => {
    const d = shapeDrawable(node, name);
    if (d) {
      drawables.push(d);
      attrs.push(`android:background="@drawable/${d.name}"`);
    }
    if (node.opacity !== 1) attrs.push(`android:alpha="${r2(node.opacity)}"`);
    if (node.rotation) attrs.push(`android:rotation="${r2(node.rotation)}"`);
    const shadow = (node.effects ?? []).find((e) => e.visible && e.type === "DROP_SHADOW");
    if (shadow && shadow.type === "DROP_SHADOW") attrs.push(`android:elevation="${dp(Math.max(0, shadow.blur) / 2)}"`);
  };

  if (node.type === "TEXT") {
    const name = namer.next(node.name);
    const boxed = (node.textAutoResize ?? "WIDTH_AND_HEIGHT") !== "WIDTH_AND_HEIGHT";
    size(fillW ? "0dp" : boxed ? dp(node.width) : "wrap_content", "wrap_content");
    if (fillW && ctx.linear?.horizontal) attrs.push('android:layout_weight="1"');
    margins();
    attrs.push(`android:text="${xmlAttr(node.characters)}"`, `android:textSize="${r2(node.fontSize)}sp"`, `android:fontFamily="${xmlAttr(node.fontFamily.split(",")[0]!.replace(/['"]/g, "").trim().toLowerCase().replace(/\s+/g, "-"))}"`);
    const fill = node.fills[0];
    if (fill && fill.type === "SOLID") attrs.push(`android:textColor="${androidColor(fill.color, fill.opacity)}"`);
    const styles = [WEIGHT_STYLE(node.fontWeight), node.italic ? "italic" : undefined].filter(Boolean);
    if (styles.length) attrs.push(`android:textStyle="${styles.join("|")}"`);
    attrs.push(`android:textAlignment="${node.textAlign === "CENTER" ? "center" : node.textAlign === "RIGHT" ? "viewEnd" : "viewStart"}"`);
    if (node.maxLines && node.maxLines > 0) attrs.push(`android:maxLines="${node.maxLines}"`, 'android:ellipsize="end"');
    if (node.letterSpacing) attrs.push(`android:letterSpacing="${r2(node.letterSpacing / Math.max(1, node.fontSize))}"`);
    if (node.opacity !== 1) attrs.push(`android:alpha="${r2(node.opacity)}"`);
    if (node.rotation) attrs.push(`android:rotation="${r2(node.rotation)}"`);
    return `${pad}<TextView\n${attrs.map((a) => `${pad}    ${a}`).join("\n")} />`;
  }

  if (node.type === "IMAGE" || node.type === "VECTOR") {
    const name = namer.next(node.name);
    size(dp(node.width), dp(node.height));
    margins();
    attrs.push(`android:src="@drawable/${name}"`, 'android:scaleType="fitXY"');
    if (node.opacity !== 1) attrs.push(`android:alpha="${r2(node.opacity)}"`);
    return `${pad}<!-- ${node.type === "VECTOR" ? "Vector: import the SVG as a vector drawable" : "Image: add the picture to res/drawable"} -->\n${pad}<ImageView\n${attrs.map((a) => `${pad}    ${a}`).join("\n")} />`;
  }

  const name = namer.next(node.name);
  const autoLayout = node.type === "FRAME" && (node.layoutMode === "HORIZONTAL" || node.layoutMode === "VERTICAL");
  const wide = fillW ? "0dp" : dp(node.width);
  const high = fillH ? "0dp" : dp(node.height);
  size(wide, high);
  if (inFlow && ctx.linear) {
    if (fillW && ctx.linear.horizontal) attrs.push('android:layout_weight="1"');
    if (fillH && !ctx.linear.horizontal) attrs.push('android:layout_weight="1"');
  }
  margins();
  look(`${name}_bg`);
  if (!kids.length) return `${pad}<View\n${attrs.map((a) => `${pad}    ${a}`).join("\n")} />`;

  let tag: string;
  let childCtx: (index: number) => Ctx;
  if (autoLayout && node.type === "FRAME") {
    const horizontal = node.layoutMode === "HORIZONTAL";
    tag = "LinearLayout";
    attrs.push(`android:orientation="${horizontal ? "horizontal" : "vertical"}"`);
    const p = [node.paddingTop, node.paddingRight, node.paddingBottom, node.paddingLeft].map((v) => v ?? 0);
    if (p.some((v) => v > 0)) attrs.push(`android:paddingTop="${dp(p[0]!)}"`, `android:paddingEnd="${dp(p[1]!)}"`, `android:paddingBottom="${dp(p[2]!)}"`, `android:paddingStart="${dp(p[3]!)}"`);
    const main = node.primaryAxisAlign ?? "MIN";
    const cross = node.counterAxisAlign ?? "MIN";
    const mainG = horizontal ? { MIN: "start", CENTER: "center_horizontal", MAX: "end", SPACE_BETWEEN: "start" }[main] : { MIN: "top", CENTER: "center_vertical", MAX: "bottom", SPACE_BETWEEN: "top" }[main];
    const crossG = horizontal ? { MIN: "top", CENTER: "center_vertical", MAX: "bottom" }[cross as "MIN" | "CENTER" | "MAX"] : { MIN: "start", CENTER: "center_horizontal", MAX: "end" }[cross as "MIN" | "CENTER" | "MAX"];
    attrs.push(`android:gravity="${mainG}|${crossG}"`);
    const gap = node.itemSpacing ?? 0;
    childCtx = (index) => ({ linear: { horizontal, gap, index }, framed: false });
  } else {
    tag = "FrameLayout";
    childCtx = () => ({ framed: true });
  }
  const inner = kids.map((k, i) => element(k, children, childCtx(i), namer, drawables, depth + 1)).join("\n");
  return `${pad}<${tag}\n${attrs.map((a) => `${pad}    ${a}`).join("\n")}>\n${inner}\n${pad}</${tag}>`;
}

/** Android XML for a node: its layout file (LinearLayout for auto layout, FrameLayout otherwise) followed by the shape drawables its backgrounds need. */
export function generateAndroidXml(node: DesignNode, children: ChildrenOf): string {
  const drawables: Drawable[] = [];
  const namer = new Namer();
  let layout = element(node, children, { framed: false }, namer, drawables, 0);
  // the root element declares the namespace
  layout = layout.replace(/^(\s*)<(\w+)/m, `$1<$2\n$1    ${NS}`);
  const fileName = snake(node.name);
  return [`<!-- res/layout/${fileName}.xml -->`, layout, ...drawables.map((d) => d.xml)].join("\n\n");
}
