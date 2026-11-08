import { paintColor, type DesignNode, type Paint } from "@farsha/types";

type ChildrenOf = (id: string) => DesignNode[];

const r2 = (n: number) => String(Math.round(n * 100) / 100);
const r3 = (n: number) => String(Math.round(n * 1000) / 1000);
const swiftString = (s: string) => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;
const camel = (name: string) => {
  const words = name.replace(/[^a-zA-Z0-9]+/g, " ").trim().split(" ").filter(Boolean);
  const joined = words.map((w, i) => (i === 0 ? w[0]!.toLowerCase() + w.slice(1) : w[0]!.toUpperCase() + w.slice(1))).join("");
  return /^[0-9]/.test(joined) ? `v${joined}` : joined || "view";
};
const pascal = (name: string) => {
  const c = camel(name);
  return c[0]!.toUpperCase() + c.slice(1);
};
const RESERVED = new Set(["UIView", "UILabel", "UIImageView", "UIStackView", "UIColor", "UIFont", "UIImage", "UIKit", "CALayer", "CAGradientLayer", "CGRect", "CGColor"]);

/** `UIColor(red:green:blue:alpha:)` for a hex colour (black when it is not a plain 6 digit hex). */
export function uiColor(hex: string, opacity = 1): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  const v = m ? parseInt(m[1]!, 16) : 0;
  return `UIColor(red: ${r3(((v >> 16) & 255) / 255)}, green: ${r3(((v >> 8) & 255) / 255)}, blue: ${r3((v & 255) / 255)}, alpha: ${r2(opacity)})`;
}

const WEIGHTS: Record<number, string> = { 100: "ultraLight", 200: "thin", 300: "light", 400: "regular", 500: "medium", 600: "semibold", 700: "bold", 800: "heavy", 900: "black" };
const weightName = (w: number) => WEIGHTS[Math.min(900, Math.max(100, Math.round(w / 100) * 100))] ?? "regular";

type ColourPaint = Exclude<Paint, { type: "IMAGE" }>;

/** The top fill that is a colour or a gradient (pictures are not drawn here). */
function solidOf(node: DesignNode): ColourPaint | undefined {
  return "fills" in node ? [...(node.fills ?? [])].reverse().find((f): f is ColourPaint => f.type !== "IMAGE") : undefined;
}

class Namer {
  private used = new Map<string, number>();
  next(name: string): string {
    const base = camel(name);
    const safe = RESERVED.has(base) ? `${base}View` : base;
    const n = (this.used.get(safe) ?? 0) + 1;
    this.used.set(safe, n);
    return n === 1 ? safe : `${safe}${n}`;
  }
}

function emit(node: DesignNode, children: ChildrenOf, parent: { name: string; stack: boolean; framed: boolean }, namer: Namer, out: string[]): string {
  const v = namer.next(node.type === "TEXT" ? node.characters.slice(0, 20) || node.name : node.name);
  const L = (line: string) => out.push(`        ${line}`);
  const kids = children(node.id).filter((c) => c.visible);
  const inFlow = parent.stack && node.layoutPositioning !== "ABSOLUTE";

  if (node.type === "TEXT") {
    L(`let ${v} = UILabel()`);
    L(`${v}.text = ${swiftString(node.characters)}`);
    L(`${v}.font = UIFont(name: ${swiftString(node.fontFamily)}, size: ${r2(node.fontSize)}) ?? .systemFont(ofSize: ${r2(node.fontSize)}, weight: .${weightName(node.fontWeight)})`);
    const fill = node.fills[0];
    if (fill && fill.type === "SOLID") L(`${v}.textColor = ${uiColor(fill.color, fill.opacity)}`);
    L(`${v}.textAlignment = .${node.textAlign === "CENTER" ? "center" : node.textAlign === "RIGHT" ? "right" : node.textAlign === "JUSTIFIED" ? "justified" : "left"}`);
    L(`${v}.numberOfLines = ${node.maxLines && node.maxLines > 0 ? node.maxLines : node.characters.includes("\n") || (node.textAutoResize ?? "WIDTH_AND_HEIGHT") !== "WIDTH_AND_HEIGHT" ? 0 : 1}`);
  } else if (node.type === "IMAGE" || node.type === "VECTOR") {
    L(`// ${node.type === "VECTOR" ? "Vector: export it as SVG or PDF into the asset catalog" : "Image: add the picture to the asset catalog"}`);
    L(`let ${v} = UIImageView(image: UIImage(named: ${swiftString(node.name)}))`);
    L(`${v}.contentMode = .scaleToFill`);
  } else {
    const autoLayout = node.type === "FRAME" && (node.layoutMode === "HORIZONTAL" || node.layoutMode === "VERTICAL");
    if (autoLayout && node.type === "FRAME") {
      const horizontal = node.layoutMode === "HORIZONTAL";
      const cross = node.counterAxisAlign ?? "MIN";
      const alignment = horizontal ? { MIN: ".top", CENTER: ".center", MAX: ".bottom" }[cross as "MIN" | "CENTER" | "MAX"] : { MIN: ".leading", CENTER: ".center", MAX: ".trailing" }[cross as "MIN" | "CENTER" | "MAX"];
      L(`let ${v} = UIStackView()`);
      L(`${v}.axis = .${horizontal ? "horizontal" : "vertical"}`);
      L(`${v}.spacing = ${r2(node.itemSpacing ?? 0)}`);
      L(`${v}.alignment = ${alignment ?? ".fill"}`);
      L(`${v}.distribution = .${node.primaryAxisAlign === "SPACE_BETWEEN" ? "equalSpacing" : "fill"}`);
      const p = [node.paddingTop, node.paddingRight, node.paddingBottom, node.paddingLeft].map((x) => x ?? 0);
      if (p.some((x) => x > 0)) {
        L(`${v}.isLayoutMarginsRelativeArrangement = true`);
        L(`${v}.layoutMargins = UIEdgeInsets(top: ${r2(p[0]!)}, left: ${r2(p[3]!)}, bottom: ${r2(p[2]!)}, right: ${r2(p[1]!)})`);
      }
    } else L(`let ${v} = UIView()`);
    const fill = solidOf(node);
    if (fill && fill.type === "SOLID") L(`${v}.backgroundColor = ${uiColor(fill.color, fill.opacity)}`);
    else if (fill) {
      const stops = [...fill.stops].sort((a, b) => a.position - b.position);
      const a = (fill.angle * Math.PI) / 180;
      L(`let ${v}Gradient = CAGradientLayer()`);
      L(`${v}Gradient.frame = CGRect(x: 0, y: 0, width: ${r2(node.width)}, height: ${r2(node.height)})`);
      L(`${v}Gradient.colors = [${stops.map((s) => `${uiColor(s.color, s.opacity * fill.opacity)}.cgColor`).join(", ")}]`);
      L(`${v}Gradient.locations = [${stops.map((s) => r2(s.position)).join(", ")}]`);
      if (fill.type === "GRADIENT_LINEAR") {
        L(`${v}Gradient.startPoint = CGPoint(x: ${r2(0.5 - Math.cos(a) / 2)}, y: ${r2(0.5 - Math.sin(a) / 2)})`);
        L(`${v}Gradient.endPoint = CGPoint(x: ${r2(0.5 + Math.cos(a) / 2)}, y: ${r2(0.5 + Math.sin(a) / 2)})`);
      } else L(`// ${fill.type === "GRADIENT_RADIAL" ? "radial" : "angular or diamond"} gradients have no CAGradientLayer type: this is the closest linear one`);
      L(`${v}.layer.insertSublayer(${v}Gradient, at: 0)`);
    }
    const radii = "cornerRadii" in node && node.cornerRadii?.length === 4 ? node.cornerRadii : null;
    const radius = node.type === "ELLIPSE" ? Math.min(node.width, node.height) / 2 : radii ? Math.max(...radii) : "cornerRadius" in node ? node.cornerRadius : 0;
    if (radius > 0) L(`${v}.layer.cornerRadius = ${r2(radius)}`);
    if (node.type === "FRAME" && node.clipsContent) L(`${v}.clipsToBounds = true`);
    const stroke = "strokes" in node ? node.strokes?.[0] : undefined;
    if (stroke && "strokeWidth" in node && node.strokeWidth) {
      L(`${v}.layer.borderWidth = ${r2(node.strokeWidth)}`);
      L(`${v}.layer.borderColor = ${uiColor(paintColor(stroke), stroke.opacity)}.cgColor`);
    }
  }

  // opacity, rotation, shadow (common to every kind of layer)
  if (node.opacity !== 1) L(`${v}.alpha = ${r2(node.opacity)}`);
  if (node.rotation) L(`${v}.transform = CGAffineTransform(rotationAngle: ${r3((node.rotation * Math.PI) / 180)})`);
  const shadow = (node.effects ?? []).find((e) => e.visible && e.type === "DROP_SHADOW");
  if (shadow && shadow.type === "DROP_SHADOW") {
    L(`${v}.layer.shadowColor = ${uiColor(shadow.color, 1)}.cgColor`);
    L(`${v}.layer.shadowOpacity = ${r2(shadow.opacity)}`);
    L(`${v}.layer.shadowOffset = CGSize(width: ${r2(shadow.x)}, height: ${r2(shadow.y)})`);
    L(`${v}.layer.shadowRadius = ${r2(Math.max(0, shadow.blur) / 2)}`);
  }

  // children first, so the parent is complete, then place this view in its parent
  const isStack = node.type === "FRAME" && (node.layoutMode === "HORIZONTAL" || node.layoutMode === "VERTICAL");
  for (const k of kids) {
    const childVar = emit(k, children, { name: v, stack: isStack, framed: !isStack }, namer, out);
    L(isStack && k.layoutPositioning !== "ABSOLUTE" ? `${v}.addArrangedSubview(${childVar})` : `${v}.addSubview(${childVar})`);
  }
  if (inFlow) {
    const fixedW = node.layoutSizingH !== "FILL" && !(node.type === "TEXT" && (node.textAutoResize ?? "WIDTH_AND_HEIGHT") === "WIDTH_AND_HEIGHT");
    const fixedH = node.layoutSizingV !== "FILL" && node.type !== "TEXT";
    if (fixedW || fixedH) L(`${v}.translatesAutoresizingMaskIntoConstraints = false`);
    if (fixedW) L(`${v}.widthAnchor.constraint(equalToConstant: ${r2(node.width)}).isActive = true`);
    if (fixedH) L(`${v}.heightAnchor.constraint(equalToConstant: ${r2(node.height)}).isActive = true`);
  } else if (parent.name) L(`${v}.frame = CGRect(x: ${r2(node.x)}, y: ${r2(node.y)}, width: ${r2(node.width)}, height: ${r2(node.height)})`);
  return v;
}

/** A Swift class name for a layer name: PascalCase, not starting with a digit, never a UIKit type used in the code. */
export function uikitClassName(name: string): string {
  const base = pascal(name);
  return RESERVED.has(base) || RESERVED.has(`UI${base}`) ? `${base}View` : base;
}

/** UIKit source (Swift, programmatic) for a node and its visible descendants: a `UIView` subclass that builds the layers in `setup()`. */
export function generateUIKit(node: DesignNode, children: ChildrenOf): string {
  const lines: string[] = [];
  const namer = new Namer();
  if (node.type === "TEXT" || node.type === "IMAGE" || node.type === "VECTOR") {
    // a single label or picture: it becomes the only subview of the class
    const only = emit(node, children, { name: "self", stack: false, framed: true }, namer, lines);
    lines.push(`        addSubview(${only})`);
    return `import UIKit\n\nfinal class ${uikitClassName(node.name)}: UIView {\n    override init(frame: CGRect) {\n        super.init(frame: frame)\n        setup()\n    }\n\n    required init?(coder: NSCoder) {\n        super.init(coder: coder)\n        setup()\n    }\n\n    private func setup() {\n${lines.join("\n")}\n    }\n}`;
  }
  const isStack = node.type === "FRAME" && (node.layoutMode === "HORIZONTAL" || node.layoutMode === "VERTICAL");
  // the root view is the class itself: its own look is applied to `self`, its layers are added to `self`
  const kids = children(node.id).filter((c) => c.visible);
  const L = (line: string) => lines.push(`        ${line}`);
  const fill = solidOf(node);
  if (fill && fill.type === "SOLID") L(`backgroundColor = ${uiColor(fill.color, fill.opacity)}`);
  const radius = node.type === "ELLIPSE" ? Math.min(node.width, node.height) / 2 : "cornerRadius" in node ? node.cornerRadius : 0;
  if (radius > 0) L(`layer.cornerRadius = ${r2(radius)}`);
  if (node.type === "FRAME" && node.clipsContent) L("clipsToBounds = true");
  if (isStack) L("// Auto layout: add the layers to a UIStackView that fills this view");
  const host = isStack ? "stack" : "self";
  if (isStack && node.type === "FRAME") {
    const horizontal = node.layoutMode === "HORIZONTAL";
    L("let stack = UIStackView()");
    L(`stack.axis = .${horizontal ? "horizontal" : "vertical"}`);
    L(`stack.spacing = ${r2(node.itemSpacing ?? 0)}`);
    L("stack.translatesAutoresizingMaskIntoConstraints = false");
    L("addSubview(stack)");
    const p = [node.paddingTop, node.paddingRight, node.paddingBottom, node.paddingLeft].map((x) => x ?? 0);
    L(`NSLayoutConstraint.activate([stack.topAnchor.constraint(equalTo: topAnchor, constant: ${r2(p[0]!)}), stack.leadingAnchor.constraint(equalTo: leadingAnchor, constant: ${r2(p[3]!)}), stack.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -${r2(p[1]!)}), stack.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -${r2(p[2]!)})])`);
  }
  for (const k of kids) {
    const childVar = emit(k, children, { name: host, stack: isStack, framed: !isStack }, namer, lines);
    lines.push(`        ${isStack && k.layoutPositioning !== "ABSOLUTE" ? "stack.addArrangedSubview" : `${host === "self" ? "" : "stack."}addSubview`}(${childVar})`);
  }
  const name = uikitClassName(node.name);
  return `import UIKit\n\nfinal class ${name}: UIView {\n    override init(frame: CGRect) {\n        super.init(frame: frame)\n        setup()\n    }\n\n    required init?(coder: NSCoder) {\n        super.init(coder: coder)\n        setup()\n    }\n\n    private func setup() {\n${lines.join("\n")}\n    }\n}`;
}
