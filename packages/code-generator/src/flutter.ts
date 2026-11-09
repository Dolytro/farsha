import { paintColor, type DesignNode, type Paint } from "@farsha/types";

type ChildrenOf = (id: string) => DesignNode[];
type Layout = "HORIZONTAL" | "VERTICAL";

const r2 = (n: number) => String(Math.round(n * 100) / 100);
const pascal = (name: string) =>
  name
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join("") || "Component";
const dartString = (s: string) => `'${s.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\$/g, "\\$").replace(/\r?\n/g, "\\n")}'`;

/** `Color(0xAARRGGBB)` for a hex colour (black when it is not a plain 6 digit hex). */
export function flutterColor(hex: string, opacity = 1): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  const alpha = Math.round(Math.min(1, Math.max(0, opacity)) * 255);
  return `Color(0x${alpha.toString(16).padStart(2, "0").toUpperCase()}${(m ? m[1]! : "000000").toUpperCase()})`;
}

/** The Flutter gradient of a paint (a colour is just `color:`); images have none (null). */
export function flutterPaint(p: Paint): { gradient: boolean; code: string } | null {
  if (p.type === "SOLID") return { gradient: false, code: flutterColor(p.color, p.opacity) };
  if (p.type === "IMAGE") return null;
  const sorted = [...p.stops].sort((a, b) => a.position - b.position);
  const colors = `colors: [${sorted.map((s) => flutterColor(s.color, s.opacity * p.opacity)).join(", ")}], stops: [${sorted.map((s) => r2(s.position)).join(", ")}]`;
  if (p.type === "GRADIENT_ANGULAR") return { gradient: true, code: `SweepGradient(${colors})` };
  if (p.type === "GRADIENT_RADIAL" || p.type === "GRADIENT_DIAMOND") return { gradient: true, code: `RadialGradient(${colors})` };
  const a = (p.angle * Math.PI) / 180;
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  return { gradient: true, code: `LinearGradient(begin: Alignment(${r2(-dx)}, ${r2(-dy)}), end: Alignment(${r2(dx)}, ${r2(dy)}), ${colors})` };
}

const weightOf = (w: number) => `FontWeight.w${Math.min(9, Math.max(1, Math.round(w / 100))) * 100}`;

function radiusOf(node: DesignNode): string | null {
  const radii = "cornerRadii" in node && node.cornerRadii?.length === 4 && node.cornerRadii.some((r) => r > 0) ? node.cornerRadii : null;
  if (radii && new Set(radii).size > 1) return `BorderRadius.only(topLeft: Radius.circular(${r2(radii[0]!)}), topRight: Radius.circular(${r2(radii[1]!)}), bottomRight: Radius.circular(${r2(radii[2]!)}), bottomLeft: Radius.circular(${r2(radii[3]!)}))`;
  const radius = radii ? radii[0]! : "cornerRadius" in node ? node.cornerRadius : 0;
  return radius > 0 ? `BorderRadius.circular(${r2(radius)})` : null;
}

interface Ctx {
  layout?: Layout;
  /** The parent is a Stack, so each child is placed at its own x and y. */
  stacked: boolean;
}

const indent = (code: string, pad: string) => code.split("\n").map((l) => (l ? pad + l : l)).join("\n");

/** Wrap a widget: `Outer(args, child: <widget>)` over several lines. */
const wrap = (outer: string, args: string[], child: string, pad: string): string => `${outer}(\n${[...args.map((a) => `${pad}  ${a},`), `${pad}  child: ${child.replace(/\n/g, `\n${pad}  `)},`].join("\n")}\n${pad})`;

function widget(node: DesignNode, children: ChildrenOf, ctx: Ctx, depth: number): string {
  const pad = "  ".repeat(depth);
  const kids = children(node.id).filter((c) => c.visible);
  const inFlow = !!ctx.layout && node.layoutPositioning !== "ABSOLUTE";
  let out: string;

  if (node.type === "TEXT") {
    const fill = node.fills[0];
    const style = [];
    if (fill && fill.type === "SOLID") style.push(`color: ${flutterColor(fill.color, fill.opacity)}`);
    style.push(`fontFamily: ${dartString(node.fontFamily.split(",")[0]!.replace(/["']/g, "").trim())}`, `fontSize: ${r2(node.fontSize)}`, `fontWeight: ${weightOf(node.fontWeight)}`);
    if (node.italic) style.push("fontStyle: FontStyle.italic");
    if (node.letterSpacing) style.push(`letterSpacing: ${r2(node.letterSpacing)}`);
    if (node.lineHeight !== "AUTO" && node.fontSize > 0) style.push(`height: ${r2(node.lineHeight / node.fontSize)}`);
    if (node.textDecoration === "UNDERLINE") style.push("decoration: TextDecoration.underline");
    else if (node.textDecoration === "STRIKETHROUGH") style.push("decoration: TextDecoration.lineThrough");
    const align = node.textAlign === "CENTER" ? "center" : node.textAlign === "RIGHT" ? "right" : node.textAlign === "JUSTIFIED" ? "justify" : "left";
    const args = [dartString(node.characters), `style: TextStyle(${style.join(", ")})`, `textAlign: TextAlign.${align}`];
    if (node.maxLines && node.maxLines > 0) args.push(`maxLines: ${node.maxLines}`, "overflow: TextOverflow.ellipsis");
    out = `Text(\n${args.map((a) => `${pad}  ${a},`).join("\n")}\n${pad})`;
    if ((node.textAutoResize ?? "WIDTH_AND_HEIGHT") !== "WIDTH_AND_HEIGHT") out = wrap("SizedBox", [`width: ${r2(node.width)}`, ...(node.textAutoResize === "NONE" ? [`height: ${r2(node.height)}`] : [])], out, pad);
  } else if (node.type === "VECTOR" || node.type === "IMAGE") {
    const note = node.type === "VECTOR" ? "Vector: export the layer as SVG and load it with flutter_svg" : "Image: add the picture to assets and use Image.asset";
    out = `// ${note}\n${pad}SizedBox(width: ${r2(node.width)}, height: ${r2(node.height)}, child: const Placeholder())`;
  } else {
    const fill = "fills" in node ? [...(node.fills ?? [])].reverse().find((f) => flutterPaint(f) !== null) : undefined;
    const paint = fill ? flutterPaint(fill) : null;
    const stroke = "strokes" in node ? node.strokes?.[0] : undefined;
    const deco: string[] = [];
    if (paint) deco.push(paint.gradient ? `gradient: ${paint.code}` : `color: ${paint.code}`);
    const radius = radiusOf(node);
    if (radius && node.type !== "ELLIPSE") deco.push(`borderRadius: ${radius}`);
    if (node.type === "ELLIPSE") deco.push(node.width === node.height ? "shape: BoxShape.circle" : "borderRadius: BorderRadius.all(Radius.elliptical(9999, 9999))");
    if (stroke && "strokeWidth" in node && node.strokeWidth) deco.push(`border: Border.all(color: ${flutterColor(paintColor(stroke), stroke.opacity)}, width: ${r2(node.strokeWidth)})`);
    const shadows = (node.effects ?? []).filter((e) => e.visible && e.type === "DROP_SHADOW").map((e) => (e.type === "DROP_SHADOW" ? `BoxShadow(color: ${flutterColor(e.color, e.opacity)}, offset: Offset(${r2(e.x)}, ${r2(e.y)}), blurRadius: ${r2(e.blur)}${e.spread ? `, spreadRadius: ${r2(e.spread)}` : ""})` : ""));
    if (shadows.length) deco.push(`boxShadow: [${shadows.join(", ")}]`);

    const args: string[] = [];
    const fillW = inFlow && node.layoutSizingH === "FILL";
    const fillH = inFlow && node.layoutSizingV === "FILL";
    if (!fillW) args.push(`width: ${r2(node.width)}`);
    if (!fillH) args.push(`height: ${r2(node.height)}`);
    if (deco.length) args.push(`decoration: BoxDecoration(${deco.join(", ")})`);
    if (node.type === "FRAME" && node.clipsContent && deco.length) args.push("clipBehavior: Clip.antiAlias");

    let child: string | null = null;
    if (node.type === "FRAME" && kids.length) {
      const auto = node.layoutMode === "HORIZONTAL" || node.layoutMode === "VERTICAL";
      if (auto) {
        const row = node.layoutMode === "HORIZONTAL";
        const main = { MIN: "start", CENTER: "center", MAX: "end", SPACE_BETWEEN: "spaceBetween" }[node.primaryAxisAlign ?? "MIN"];
        const crossKey = node.counterAxisAlign ?? "MIN";
        const cross = crossKey === "BASELINE" ? "baseline" : { MIN: "start", CENTER: "center", MAX: "end" }[crossKey];
        const body = kids.map((k) => widget(k, children, { layout: node.layoutMode as Layout, stacked: k.layoutPositioning === "ABSOLUTE" }, depth + 2));
        const list = [`mainAxisSize: MainAxisSize.min`, `mainAxisAlignment: MainAxisAlignment.${main}`, `crossAxisAlignment: CrossAxisAlignment.${cross}`, ...(node.itemSpacing ? [`spacing: ${r2(node.itemSpacing)}`] : [])];
        const flex = `${row ? "Row" : "Column"}(\n${list.map((a) => `${pad}    ${a},`).join("\n")}\n${pad}    children: [\n${body.map((b) => `${indent(b, "    ")},`).join("\n")}\n${pad}    ],\n${pad}  )`;
        const p = [node.paddingTop, node.paddingRight, node.paddingBottom, node.paddingLeft].map((v) => v ?? 0);
        child = p.some((v) => v > 0) ? `Padding(\n${pad}    padding: EdgeInsets.fromLTRB(${r2(p[3]!)}, ${r2(p[0]!)}, ${r2(p[1]!)}, ${r2(p[2]!)}),\n${pad}    child: ${flex},\n${pad}  )` : flex;
      } else {
        const body = kids.map((k) => widget(k, children, { stacked: true }, depth + 3));
        child = `Stack(\n${pad}    clipBehavior: Clip.none,\n${pad}    children: [\n${body.join(",\n")},\n${pad}    ],\n${pad}  )`;
      }
    }
    out = child ? `Container(\n${args.map((a) => `${pad}  ${a},`).join("\n")}\n${pad}  child: ${child},\n${pad})` : `Container(${args.join(", ")})`;
  }

  // transforms and opacity wrap the widget from the inside out
  if (node.flipX || node.flipY) out = wrap("Transform.scale", [`scaleX: ${node.flipX ? "-1" : "1"}`, `scaleY: ${node.flipY ? "-1" : "1"}`], out, pad);
  if (node.rotation) out = wrap("Transform.rotate", [`angle: ${r2((node.rotation * Math.PI) / 180)}`], out, pad);
  if (node.opacity !== 1) out = wrap("Opacity", [`opacity: ${r2(node.opacity)}`], out, pad);
  const fillW = inFlow && node.layoutSizingH === "FILL";
  const fillH = inFlow && node.layoutSizingV === "FILL";
  if ((fillW && ctx.layout === "HORIZONTAL") || (fillH && ctx.layout === "VERTICAL")) out = wrap("Expanded", [], out, pad);
  if (ctx.stacked) out = wrap("Positioned", [`left: ${r2(node.x)}`, `top: ${r2(node.y)}`], out, pad);
  return `${pad}${out}`;
}

// Names a generated class must not take, because the code builds these widgets.
const RESERVED = new Set(["Container", "Row", "Column", "Text", "Stack", "Padding", "Positioned", "Expanded", "Opacity", "SizedBox", "Placeholder", "Color", "Offset"]);

/** A valid Dart class name for a layer name: PascalCase with a `Widget` ending, not starting with a digit, never one of the widgets used in the code. */
export function flutterClassName(name: string): string {
  const base = pascal(name);
  const safe = /^[0-9]/.test(base) ? `C${base}` : base;
  return RESERVED.has(safe) || !/Widget$/.test(safe) ? `${safe}Widget` : safe;
}

/** Flutter source for a node and its visible descendants, as one `StatelessWidget` named after the node. */
export function generateFlutter(node: DesignNode, children: ChildrenOf): string {
  const body = widget(node, children, { stacked: false }, 3).trimStart();
  const cls = flutterClassName(node.name);
  return `import 'package:flutter/material.dart';\n\nclass ${cls} extends StatelessWidget {\n  const ${cls}({super.key});\n\n  @override\n  Widget build(BuildContext context) {\n    return ${body};\n  }\n}`;
}
