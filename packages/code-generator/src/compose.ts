import { paintColor, type DesignNode, type Paint } from "@farsha/types";

type ChildrenOf = (id: string) => DesignNode[];
type Layout = "HORIZONTAL" | "VERTICAL";

const r2 = (n: number) => String(Math.round(n * 100) / 100);
const dp = (n: number) => `${r2(n)}.dp`;
const pascal = (name: string) =>
  name
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join("") || "Component";
const snake = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").replace(/^([0-9])/, "_$1") || "image";
const kotlinString = (s: string) => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\$/g, "\\$").replace(/\n/g, "\\n")}"`;

/** `Color(0xAARRGGBB)` for a hex colour (black when it is not a plain 6 digit hex). */
export function composeColor(hex: string, opacity = 1): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  const alpha = Math.round(Math.min(1, Math.max(0, opacity)) * 255);
  return `Color(0x${alpha.toString(16).padStart(2, "0").toUpperCase()}${(m ? m[1]! : "000000").toUpperCase()})`;
}

/** The Compose brush (or colour) of a paint; images have none (null). */
export function composePaint(p: Paint, size: { width: number; height: number }): { brush: boolean; code: string } | null {
  if (p.type === "SOLID") return { brush: false, code: composeColor(p.color, p.opacity) };
  if (p.type === "IMAGE") return null;
  const stops = [...p.stops].sort((a, b) => a.position - b.position).map((s) => `${r2(s.position)}f to ${composeColor(s.color, s.opacity * p.opacity)}`);
  const list = stops.join(", ");
  const cx = r2(size.width / 2);
  const cy = r2(size.height / 2);
  if (p.type === "GRADIENT_ANGULAR") return { brush: true, code: `Brush.sweepGradient(${list}, center = Offset(${cx}f, ${cy}f))` };
  if (p.type === "GRADIENT_RADIAL" || p.type === "GRADIENT_DIAMOND") return { brush: true, code: `Brush.radialGradient(${list}, center = Offset(${cx}f, ${cy}f), radius = ${r2(Math.max(size.width, size.height) / 2)}f)` };
  const a = (p.angle * Math.PI) / 180;
  const dx = (Math.cos(a) * size.width) / 2;
  const dy = (Math.sin(a) * size.height) / 2;
  return { brush: true, code: `Brush.linearGradient(${list}, start = Offset(${r2(size.width / 2 - dx)}f, ${r2(size.height / 2 - dy)}f), end = Offset(${r2(size.width / 2 + dx)}f, ${r2(size.height / 2 + dy)}f))` };
}

const WEIGHTS: Record<number, string> = { 100: "Thin", 200: "ExtraLight", 300: "Light", 400: "Normal", 500: "Medium", 600: "SemiBold", 700: "Bold", 800: "ExtraBold", 900: "Black" };
const weightName = (w: number) => WEIGHTS[Math.min(900, Math.max(100, Math.round(w / 100) * 100))] ?? "Normal";

function shapeOf(node: DesignNode): string {
  if (node.type === "ELLIPSE") return node.width === node.height ? "CircleShape" : "RoundedCornerShape(percent = 50)";
  const radii = "cornerRadii" in node && node.cornerRadii?.length === 4 && node.cornerRadii.some((r) => r > 0) ? node.cornerRadii : null;
  if (radii && new Set(radii).size > 1) return `RoundedCornerShape(topStart = ${dp(radii[0]!)}, topEnd = ${dp(radii[1]!)}, bottomEnd = ${dp(radii[2]!)}, bottomStart = ${dp(radii[3]!)})`;
  const radius = radii ? radii[0]! : "cornerRadius" in node ? node.cornerRadius : 0;
  return radius > 0 ? `RoundedCornerShape(${dp(radius)})` : "RectangleShape";
}

function topFill(node: DesignNode): Paint | undefined {
  return "fills" in node ? [...(node.fills ?? [])].reverse().find((f) => composePaint(f, node) !== null) : undefined;
}

interface Ctx {
  layout?: Layout;
  /** The parent is a Box, so each child is offset to its own x and y. */
  stacked: boolean;
}

function view(node: DesignNode, children: ChildrenOf, ctx: Ctx, depth: number): string {
  const pad = "    ".repeat(depth);
  const mods: string[] = [];
  const kids = children(node.id).filter((c) => c.visible);
  const inFlow = !!ctx.layout && node.layoutPositioning !== "ABSOLUTE";
  const fillW = inFlow && node.layoutSizingH === "FILL";
  const fillH = inFlow && node.layoutSizingV === "FILL";
  const horizontal = ctx.layout === "HORIZONTAL";
  const size = (width: number | null, height: number | null): void => {
    if (fillW) mods.push(horizontal ? ".weight(1f)" : ".fillMaxWidth()");
    if (fillH) mods.push(horizontal ? ".fillMaxHeight()" : ".weight(1f)");
    if (!fillW && !fillH && width !== null && height !== null) mods.push(`.size(${dp(width)}, ${dp(height)})`);
    else {
      if (!fillW && width !== null) mods.push(`.width(${dp(width)})`);
      if (!fillH && height !== null) mods.push(`.height(${dp(height)})`);
    }
  };
  const start = (): void => {
    if (ctx.stacked) mods.push(`.offset(x = ${dp(node.x)}, y = ${dp(node.y)})`);
  };
  const look = (shape: string): void => {
    if (node.rotation) mods.push(`.rotate(${r2(node.rotation)}f)`);
    if (node.flipX || node.flipY) mods.push(`.graphicsLayer(scaleX = ${node.flipX ? "-1f" : "1f"}, scaleY = ${node.flipY ? "-1f" : "1f"})`);
    if (node.opacity !== 1) mods.push(`.alpha(${r2(node.opacity)}f)`);
    for (const e of node.effects ?? []) {
      if (!e.visible) continue;
      if (e.type === "DROP_SHADOW") mods.push(`.shadow(elevation = ${dp(Math.max(0, e.blur) / 2)}, shape = ${shape}, ambientColor = ${composeColor(e.color, e.opacity)}, spotColor = ${composeColor(e.color, e.opacity)})`);
      else if (e.type === "LAYER_BLUR") mods.push(`.blur(${dp(Math.max(0, e.radius) / 2)})`);
    }
  };
  const modifier = (): string => (mods.length ? `Modifier${mods.map((m) => `\n${pad}        ${m}`).join("")}` : "Modifier");

  if (node.type === "TEXT") {
    start();
    const boxed = (node.textAutoResize ?? "WIDTH_AND_HEIGHT") !== "WIDTH_AND_HEIGHT";
    size(boxed ? node.width : null, node.textAutoResize === "NONE" ? node.height : null);
    const fill = node.fills[0];
    const args = [`text = ${kotlinString(node.characters)}`];
    if (fill && fill.type === "SOLID") args.push(`color = ${composeColor(fill.color, fill.opacity)}`);
    args.push(`fontSize = ${r2(node.fontSize)}.sp`, `fontWeight = FontWeight.${weightName(node.fontWeight)}`);
    if (node.italic) args.push("fontStyle = FontStyle.Italic");
    if (node.letterSpacing) args.push(`letterSpacing = ${r2(node.letterSpacing)}.sp`);
    if (node.lineHeight !== "AUTO") args.push(`lineHeight = ${r2(node.lineHeight)}.sp`);
    if (node.textDecoration === "UNDERLINE") args.push("textDecoration = TextDecoration.Underline");
    else if (node.textDecoration === "STRIKETHROUGH") args.push("textDecoration = TextDecoration.LineThrough");
    args.push(`textAlign = TextAlign.${node.textAlign === "CENTER" ? "Center" : node.textAlign === "RIGHT" ? "End" : node.textAlign === "JUSTIFIED" ? "Justify" : "Start"}`);
    if (node.maxLines && node.maxLines > 0) args.push(`maxLines = ${node.maxLines}`);
    if (mods.length) args.push(`modifier = ${modifier()}`);
    return `${pad}// font: ${node.fontFamily.replace(/[\r\n]/g, " ")}\n${pad}Text(\n${args.map((a) => `${pad}    ${a},`).join("\n")}\n${pad})`;
  }

  if (node.type === "VECTOR" || node.type === "IMAGE") {
    start();
    size(node.width, node.height);
    look("RectangleShape");
    const note = node.type === "VECTOR" ? "Vector: import the SVG as a drawable" : "Image: add the picture to res/drawable";
    return `${pad}// ${note}\n${pad}Image(painter = painterResource(R.drawable.${snake(node.name)}), contentDescription = null, modifier = ${modifier()})`;
  }

  const shape = shapeOf(node);
  const fill = topFill(node);
  const paint = fill ? composePaint(fill, node) : null;
  const stroke = "strokes" in node ? node.strokes?.[0] : undefined;
  const hasKids = node.type === "FRAME" && kids.length > 0;

  start();
  size(node.width, node.height);
  look(shape);
  if (node.type === "FRAME" && node.clipsContent) mods.push(`.clip(${shape})`);
  if (paint) mods.push(`.background(${paint.code}, ${shape})`);
  if (stroke && "strokeWidth" in node && node.strokeWidth) mods.push(`.border(${dp(node.strokeWidth)}, ${composeColor(paintColor(stroke), stroke.opacity)}, ${shape})`);

  if (!hasKids) return `${pad}Box(modifier = ${modifier()})`;

  const autoLayout = node.layoutMode === "HORIZONTAL" || node.layoutMode === "VERTICAL";
  let head: string;
  if (autoLayout) {
    const row = node.layoutMode === "HORIZONTAL";
    const p = [node.paddingTop, node.paddingRight, node.paddingBottom, node.paddingLeft].map((v) => v ?? 0);
    if (p.some((v) => v > 0)) mods.push(`.padding(start = ${dp(p[3]!)}, top = ${dp(p[0]!)}, end = ${dp(p[1]!)}, bottom = ${dp(p[2]!)})`);
    const gap = dp(node.itemSpacing ?? 0);
    const main = node.primaryAxisAlign ?? "MIN";
    const mainAlign = row ? { MIN: "Alignment.Start", CENTER: "Alignment.CenterHorizontally", MAX: "Alignment.End" } : { MIN: "Alignment.Top", CENTER: "Alignment.CenterVertically", MAX: "Alignment.Bottom" };
    const arrangement = main === "SPACE_BETWEEN" ? "Arrangement.SpaceBetween" : main === "MIN" ? `Arrangement.spacedBy(${gap})` : `Arrangement.spacedBy(${gap}, ${mainAlign[main]})`;
    const cross = node.counterAxisAlign ?? "MIN";
    const crossAlign = row ? { MIN: "Alignment.Top", CENTER: "Alignment.CenterVertically", MAX: "Alignment.Bottom" }[cross as "MIN" | "CENTER" | "MAX"] : { MIN: "Alignment.Start", CENTER: "Alignment.CenterHorizontally", MAX: "Alignment.End" }[cross as "MIN" | "CENTER" | "MAX"];
    head = row ? `Row(modifier = ${modifier()},\n${pad}    horizontalArrangement = ${arrangement},\n${pad}    verticalAlignment = ${crossAlign ?? "Alignment.Top"}` : `Column(modifier = ${modifier()},\n${pad}    verticalArrangement = ${arrangement},\n${pad}    horizontalAlignment = ${crossAlign ?? "Alignment.Start"}`;
  } else head = `Box(modifier = ${modifier()}`;
  const body = kids.map((k) => view(k, children, { layout: autoLayout ? (node.layoutMode as Layout) : undefined, stacked: !autoLayout || k.layoutPositioning === "ABSOLUTE" }, depth + 1));
  return `${pad}${head}\n${pad}) {\n${body.join("\n")}\n${pad}}`;
}

const IMPORTS = [
  "androidx.compose.foundation.Image",
  "androidx.compose.foundation.background",
  "androidx.compose.foundation.border",
  "androidx.compose.foundation.layout.*",
  "androidx.compose.foundation.shape.*",
  "androidx.compose.material3.Text",
  "androidx.compose.runtime.Composable",
  "androidx.compose.ui.Alignment",
  "androidx.compose.ui.Modifier",
  "androidx.compose.ui.draw.*",
  "androidx.compose.ui.geometry.Offset",
  "androidx.compose.ui.graphics.*",
  "androidx.compose.ui.res.painterResource",
  "androidx.compose.ui.text.font.*",
  "androidx.compose.ui.text.style.*",
  "androidx.compose.ui.unit.*",
];

// Names a generated function must not take, because the code calls these composables.
const RESERVED = new Set(["Box", "Row", "Column", "Text", "Image", "Color", "Modifier", "Spacer", "Brush", "Offset", "Alignment", "Arrangement", "Composable"]);

/** A valid Kotlin function name for a layer name: PascalCase, not starting with a digit, never one of the composables used in the code. */
export function composeFunctionName(name: string): string {
  const base = pascal(name);
  const safe = /^[0-9]/.test(base) ? `C${base}` : base;
  return RESERVED.has(safe) ? `${safe}Layout` : safe;
}

/** Jetpack Compose source for a node and its visible descendants, as one `@Composable` function named after the node. */
export function generateCompose(node: DesignNode, children: ChildrenOf): string {
  const body = view(node, children, { stacked: false }, 1);
  return `${IMPORTS.map((i) => `import ${i}`).join("\n")}\n\n@Composable\nfun ${composeFunctionName(node.name)}() {\n${body}\n}`;
}
