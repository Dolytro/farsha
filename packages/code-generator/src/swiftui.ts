import { paintColor, type DesignNode, type Paint } from "@farsha/types";

type ChildrenOf = (id: string) => DesignNode[];
type Layout = "HORIZONTAL" | "VERTICAL";

const r2 = (n: number) => String(Math.round(n * 100) / 100);
const r3 = (n: number) => String(Math.round(n * 1000) / 1000);
const pascal = (name: string) =>
  name
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join("") || "Component";
const swiftString = (s: string) => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;

/** `Color(red:green:blue:)` for a hex colour (black when it is not a plain 6 digit hex), with `.opacity` when it is see-through. */
export function swiftColor(hex: string, opacity = 1): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  const v = m ? parseInt(m[1]!, 16) : 0;
  const c = `Color(red: ${r3(((v >> 16) & 255) / 255)}, green: ${r3(((v >> 8) & 255) / 255)}, blue: ${r3((v & 255) / 255)})`;
  return opacity < 1 ? `${c}.opacity(${r2(opacity)})` : c;
}

/** The SwiftUI shape style of a paint: a colour or a gradient. Images have no style (null). */
export function swiftPaint(p: Paint, size: { width: number; height: number }): string | null {
  if (p.type === "SOLID") return swiftColor(p.color, p.opacity);
  if (p.type === "IMAGE") return null;
  const stops = [...p.stops].sort((a, b) => a.position - b.position);
  const list = stops.map((s) => `.init(color: ${swiftColor(s.color, s.opacity * p.opacity)}, location: ${r2(s.position)})`).join(", ");
  const gradient = `Gradient(stops: [${list}])`;
  if (p.type === "GRADIENT_ANGULAR") return `AngularGradient(gradient: ${gradient}, center: .center)`;
  if (p.type === "GRADIENT_RADIAL" || p.type === "GRADIENT_DIAMOND") return `RadialGradient(gradient: ${gradient}, center: .center, startRadius: 0, endRadius: ${r2(Math.max(size.width, size.height) / 2)})`;
  const a = (p.angle * Math.PI) / 180;
  const dx = Math.cos(a) / 2;
  const dy = Math.sin(a) / 2;
  return `LinearGradient(gradient: ${gradient}, startPoint: UnitPoint(x: ${r2(0.5 - dx)}, y: ${r2(0.5 - dy)}), endPoint: UnitPoint(x: ${r2(0.5 + dx)}, y: ${r2(0.5 + dy)}))`;
}

const WEIGHTS: Record<number, string> = { 100: "ultraLight", 200: "thin", 300: "light", 400: "regular", 500: "medium", 600: "semibold", 700: "bold", 800: "heavy", 900: "black" };
const weightName = (w: number) => WEIGHTS[Math.min(900, Math.max(100, Math.round(w / 100) * 100))] ?? "regular";

function shapeOf(node: DesignNode): string {
  if (node.type === "ELLIPSE") return "Ellipse()";
  const radii = "cornerRadii" in node && node.cornerRadii?.length === 4 && node.cornerRadii.some((r) => r > 0) ? node.cornerRadii : null;
  if (radii && new Set(radii).size > 1) {
    return `UnevenRoundedRectangle(topLeadingRadius: ${r2(radii[0]!)}, bottomLeadingRadius: ${r2(radii[3]!)}, bottomTrailingRadius: ${r2(radii[2]!)}, topTrailingRadius: ${r2(radii[1]!)})`;
  }
  const radius = radii ? radii[0]! : "cornerRadius" in node ? node.cornerRadius : 0;
  return radius > 0 ? `RoundedRectangle(cornerRadius: ${r2(radius)})` : "Rectangle()";
}

/** The visible top fill, since SwiftUI paints one style per shape. */
function topFill(node: DesignNode): Paint | undefined {
  return "fills" in node ? [...(node.fills ?? [])].reverse().find((f) => swiftPaint(f, node) !== null) : undefined;
}

function effectModifiers(node: DesignNode): string[] {
  const out: string[] = [];
  for (const e of node.effects ?? []) {
    if (!e.visible) continue;
    if (e.type === "DROP_SHADOW") out.push(`.shadow(color: ${swiftColor(e.color, e.opacity)}, radius: ${r2(Math.max(0, e.blur) / 2)}, x: ${r2(e.x)}, y: ${r2(e.y)})`);
    else if (e.type === "LAYER_BLUR") out.push(`.blur(radius: ${r2(Math.max(0, e.radius) / 2)})`);
  }
  return out;
}

function strokeOverlay(node: DesignNode, shape: string): string | null {
  const stroke = "strokes" in node ? node.strokes?.[0] : undefined;
  if (!stroke || !("strokeWidth" in node) || !node.strokeWidth) return null;
  const color = swiftColor(paintColor(stroke), stroke.opacity);
  const dash = node.strokeDash?.some((v) => v > 0) ? `, dash: [${node.strokeDash.map(r2).join(", ")}]` : "";
  const style = dash ? `style: StrokeStyle(lineWidth: ${r2(node.strokeWidth)}${dash})` : `lineWidth: ${r2(node.strokeWidth)}`;
  return `.overlay(${shape}.stroke(${color}, ${style}))`;
}

interface Ctx {
  layout?: Layout;
  /** The parent lays children out in a ZStack, so each child is offset to its own x and y. */
  stacked: boolean;
}

function view(node: DesignNode, children: ChildrenOf, ctx: Ctx, depth: number): string {
  const pad = "    ".repeat(depth);
  const mods: string[] = [];
  const kids = children(node.id).filter((c) => c.visible);
  const inFlow = !!ctx.layout && node.layoutPositioning !== "ABSOLUTE";
  const fillW = inFlow && node.layoutSizingH === "FILL";
  const fillH = inFlow && node.layoutSizingV === "FILL";
  const sizeMod = (width: number | null, height: number | null, align?: string): void => {
    const parts: string[] = [];
    if (fillW) parts.push("maxWidth: .infinity");
    else if (width !== null) parts.push(`width: ${r2(width)}`);
    if (fillH) parts.push("maxHeight: .infinity");
    else if (height !== null) parts.push(`height: ${r2(height)}`);
    if (align) parts.push(`alignment: ${align}`);
    if (parts.length) mods.push(`.frame(${parts.join(", ")})`);
  };
  const common = (): void => {
    if (node.rotation) mods.push(`.rotationEffect(.degrees(${r2(node.rotation)}))`);
    if (node.flipX || node.flipY) mods.push(`.scaleEffect(x: ${node.flipX ? -1 : 1}, y: ${node.flipY ? -1 : 1})`);
    if (node.opacity !== 1) mods.push(`.opacity(${r2(node.opacity)})`);
    mods.push(...effectModifiers(node));
    if (ctx.stacked) mods.push(`.offset(x: ${r2(node.x)}, y: ${r2(node.y)})`);
  };
  const render = (head: string, body?: string[]): string => {
    const lines = body ? [`${pad}${head} {`, ...body, `${pad}}`] : [`${pad}${head}`];
    return [...lines, ...mods.map((m) => `${pad}    ${m}`)].join("\n");
  };

  if (node.type === "TEXT") {
    const fill = node.fills[0];
    mods.push(`.font(.custom(${swiftString(node.fontFamily)}, size: ${r2(node.fontSize)}))`, `.fontWeight(.${weightName(node.fontWeight)})`);
    if (node.italic) mods.push(".italic()");
    if (node.textDecoration === "UNDERLINE") mods.push(".underline()");
    else if (node.textDecoration === "STRIKETHROUGH") mods.push(".strikethrough()");
    if (node.letterSpacing) mods.push(`.tracking(${r2(node.letterSpacing)})`);
    if (node.lineHeight !== "AUTO") mods.push(`.lineSpacing(${r2(Math.max(0, node.lineHeight - node.fontSize))})`);
    if (node.textCase === "UPPER") mods.push(".textCase(.uppercase)");
    else if (node.textCase === "LOWER") mods.push(".textCase(.lowercase)");
    if (node.maxLines && node.maxLines > 0) mods.push(`.lineLimit(${node.maxLines})`);
    if (fill && fill.type === "SOLID") mods.push(`.foregroundColor(${swiftColor(fill.color, fill.opacity)})`);
    const align = node.textAlign === "CENTER" ? "center" : node.textAlign === "RIGHT" ? "trailing" : "leading";
    mods.push(`.multilineTextAlignment(.${align})`);
    const boxed = (node.textAutoResize ?? "WIDTH_AND_HEIGHT") !== "WIDTH_AND_HEIGHT";
    sizeMod(boxed ? node.width : null, node.textAutoResize === "NONE" ? node.height : null, boxed ? `.${align}` : undefined);
    common();
    return render(`Text(${swiftString(node.characters)})`);
  }

  if (node.type === "VECTOR" || node.type === "IMAGE") {
    mods.push(".resizable()");
    sizeMod(node.width, node.height);
    common();
    return `${pad}// ${node.type === "VECTOR" ? "Vector: export it as SVG or PDF into the asset catalog" : "Image: add the picture to the asset catalog"}\n${render(`Image(${swiftString(node.name)})`)}`;
  }

  const shape = shapeOf(node);
  const fill = topFill(node);
  const style = fill ? swiftPaint(fill, node) : null;
  const stroke = strokeOverlay(node, shape);

  if (node.type === "FRAME" && kids.length > 0) {
    const autoLayout = node.layoutMode === "HORIZONTAL" || node.layoutMode === "VERTICAL";
    let head: string;
    if (autoLayout) {
      const horizontal = node.layoutMode === "HORIZONTAL";
      const cross = node.counterAxisAlign ?? "MIN";
      const alignment = horizontal ? { MIN: ".top", CENTER: ".center", MAX: ".bottom" }[cross as "MIN" | "CENTER" | "MAX"] : { MIN: ".leading", CENTER: ".center", MAX: ".trailing" }[cross as "MIN" | "CENTER" | "MAX"];
      head = `${horizontal ? "HStack" : "VStack"}(alignment: ${alignment ?? ".center"}, spacing: ${r2(node.itemSpacing ?? 0)})`;
    } else head = "ZStack(alignment: .topLeading)";
    const body = kids.map((k) => view(k, children, { layout: autoLayout ? (node.layoutMode as Layout) : undefined, stacked: !autoLayout || k.layoutPositioning === "ABSOLUTE" }, depth + 1));
    if (autoLayout) {
      const p = [node.paddingTop, node.paddingRight, node.paddingBottom, node.paddingLeft].map((v) => v ?? 0);
      if (p.some((v) => v > 0)) mods.push(`.padding(EdgeInsets(top: ${r2(p[0]!)}, leading: ${r2(p[3]!)}, bottom: ${r2(p[2]!)}, trailing: ${r2(p[1]!)}))`);
    }
    sizeMod(node.width, node.height, autoLayout ? undefined : ".topLeading");
    if (style) mods.push(`.background(${shape}.fill(${style}))`);
    if (node.clipsContent) mods.push(`.clipShape(${shape})`);
    if (stroke) mods.push(stroke);
    common();
    return render(head, body);
  }

  sizeMod(node.width, node.height);
  common();
  const base = style ? `${shape}.fill(${style})` : shape;
  if (stroke) mods.unshift(stroke);
  return render(base);
}

// Names the generated struct must not take, because the code uses these SwiftUI types.
const RESERVED = new Set(["Rectangle", "RoundedRectangle", "UnevenRoundedRectangle", "Ellipse", "Circle", "Capsule", "Text", "Image", "Color", "HStack", "VStack", "ZStack", "View", "Gradient", "LinearGradient", "RadialGradient", "AngularGradient", "UnitPoint", "EdgeInsets", "StrokeStyle", "SwiftUI", "Group", "Button", "List", "Spacer"]);

/** A valid Swift type name for a layer name: PascalCase, not starting with a digit, and never one of the SwiftUI types used in the code. */
export function swiftTypeName(name: string): string {
  const base = pascal(name);
  const safe = /^[0-9]/.test(base) ? `V${base}` : base;
  return RESERVED.has(safe) ? `${safe}View` : safe;
}

/** SwiftUI source for a node and its visible descendants, as a `View` struct named after the node. */
export function generateSwiftUI(node: DesignNode, children: ChildrenOf): string {
  const body = view(node, children, { stacked: false }, 2);
  return `import SwiftUI\n\nstruct ${swiftTypeName(node.name)}: View {\n    var body: some View {\n${body}\n    }\n}`;
}
