import { describe, expect, it } from "vitest";
import { DesignDoc, defaultsFor } from "@farsha/design-core";
import { backgroundCss, declarations, generateCode, paintCss, tailwindClass, toRgba } from "./index";

function setup() {
  const doc = new DesignDoc();
  const page = doc.pages()[0]!.id;
  const frame = doc.createNode("FRAME", { parentId: page, props: { name: "Card", width: 300, height: 200 } });
  const rect = doc.createNode("RECTANGLE", {
    parentId: frame,
    props: {
      name: "Button",
      x: 20,
      y: 30,
      width: 120,
      height: 44,
      cornerRadius: 8,
      fills: [{ type: "SOLID", color: "#388BFF", opacity: 1 }],
    },
  });
  const label = doc.createNode("TEXT", { parentId: frame, props: { name: "Label", characters: "Buy <now>", x: 10, y: 100, fontSize: 16, fontWeight: 600 } });
  return { doc, frame, rect, label };
}

describe("toRgba", () => {
  it("keeps opaque hex and converts translucent to rgba", () => {
    expect(toRgba("#388BFF")).toBe("#388bff");
    expect(toRgba("#000000", 0.5)).toBe("rgba(0, 0, 0, 0.5)");
  });
});

describe("declarations", () => {
  it("describes size, fill and radius", () => {
    const { doc, rect } = setup();
    const d = Object.fromEntries(declarations(doc.getNode(rect)!, { absolute: true }));
    expect(d).toMatchObject({ position: "absolute", left: "20px", top: "30px", width: "120px", height: "44px", background: "#388bff", "border-radius": "8px" });
  });

  it("writes shadows and layer blur, skipping hidden effects", () => {
    const n = {
      ...defaultsFor("RECTANGLE"),
      id: "r",
      parentId: null,
      orderKey: "a0",
      effects: [
        { type: "DROP_SHADOW" as const, x: 0, y: 4, blur: 8, color: "#000000", opacity: 0.25, visible: true },
        { type: "INNER_SHADOW" as const, x: 1, y: 1, blur: 2, color: "#ff0000", opacity: 1, visible: true },
        { type: "LAYER_BLUR" as const, radius: 6, visible: true },
        { type: "DROP_SHADOW" as const, x: 9, y: 9, blur: 9, color: "#000000", opacity: 1, visible: false },
      ],
    };
    const d = Object.fromEntries(declarations(n));
    expect(d["box-shadow"]).toBe("0px 4px 8px rgba(0, 0, 0, 0.25), inset 1px 1px 2px #ff0000");
    expect(d.filter).toBe("blur(6px)");
  });

  it("writes gradient fills as CSS gradients", () => {
    const stops = [
      { position: 0, color: "#ff0000", opacity: 1 },
      { position: 1, color: "#0000ff", opacity: 0.5 },
    ];
    const base = { ...defaultsFor("RECTANGLE"), id: "g", parentId: null, orderKey: "a0" };
    const lin = Object.fromEntries(declarations({ ...base, fills: [{ type: "GRADIENT_LINEAR" as const, angle: 0, opacity: 1, stops }] }));
    expect(lin.background).toBe("linear-gradient(90deg, #ff0000 0%, rgba(0, 0, 255, 0.5) 100%)");
    const rad = Object.fromEntries(declarations({ ...base, fills: [{ type: "GRADIENT_RADIAL" as const, angle: 0, opacity: 1, stops }] }));
    expect(rad.background).toContain("radial-gradient(circle, #ff0000 0%");
  });

  it("writes image fills as CSS backgrounds", () => {
    const base = { ...defaultsFor("RECTANGLE"), id: "i", parentId: null, orderKey: "a0" };
    const d = (scaleMode: "FILL" | "FIT" | "STRETCH") => Object.fromEntries(declarations({ ...base, fills: [{ type: "IMAGE" as const, assetId: "a", scaleMode, opacity: 1 }] })).background;
    expect(d("FILL")).toBe("url(image) center / cover no-repeat");
    expect(d("FIT")).toBe("url(image) center / contain no-repeat");
    expect(d("STRETCH")).toBe("url(image) 0 0 / 100% 100% no-repeat");
  });

  it("keeps line breaks in text with pre-wrap", () => {
    const n = { ...defaultsFor("TEXT"), id: "t", parentId: null, orderKey: "a0" };
    expect(Object.fromEntries(declarations(n))["white-space"]).toBeUndefined();
    expect(Object.fromEntries(declarations({ ...n, characters: "a\nb" }))["white-space"]).toBe("pre-wrap");
    expect(Object.fromEntries(declarations({ ...n, textAutoResize: "HEIGHT" as const }))["white-space"]).toBe("pre-wrap");
  });

  it("writes auto layout frames as flex containers and puts their children in the flow", () => {
    const frame = { ...defaultsFor("FRAME"), id: "f", parentId: null, orderKey: "a0", layoutMode: "HORIZONTAL" as const, itemSpacing: 12, paddingTop: 8, paddingRight: 16, paddingBottom: 8, paddingLeft: 16, primaryAxisAlign: "SPACE_BETWEEN" as const, counterAxisAlign: "CENTER" as const };
    const d = Object.fromEntries(declarations(frame));
    expect(d).toMatchObject({ display: "flex", "flex-direction": "row", gap: "12px", padding: "8px 16px 8px 16px", "justify-content": "space-between", "align-items": "center" });
    const kid = { ...defaultsFor("RECTANGLE"), id: "k", parentId: "f", orderKey: "a0" };
    const out = generateCode(frame, (id) => (id === "f" ? [kid] : []), "css");
    expect(out).toContain("display: flex;");
    expect(out.match(/position: absolute/g)).toBeNull();
  });

  it("writes blend mode", () => {
    const n = { ...defaultsFor("RECTANGLE"), id: "b", parentId: null, orderKey: "a0", blendMode: "MULTIPLY" as const };
    expect(Object.fromEntries(declarations(n))["mix-blend-mode"]).toBe("multiply");
  });

  it("writes independent corner radii", () => {
    const n = { ...defaultsFor("RECTANGLE"), id: "c", parentId: null, orderKey: "a0", cornerRadius: 4, cornerRadii: [1, 2, 3, 4] as [number, number, number, number] };
    expect(Object.fromEntries(declarations(n))["border-radius"]).toBe("1px 2px 3px 4px");
  });

  it("uses a round radius for ellipses", () => {
    expect(Object.fromEntries(declarations({ ...defaultsFor("ELLIPSE"), id: "e", parentId: null, orderKey: "a0" }))["border-radius"]).toBe("50%");
  });
});

describe("tailwindClass", () => {
  it("maps known and unknown properties", () => {
    expect(tailwindClass(["width", "120px"])).toBe("w-[120px]");
    expect(tailwindClass(["border-radius", "50%"])).toBe("rounded-full");
    expect(tailwindClass(["background", "rgba(0, 0, 0, 0.5)"])).toBe("bg-[rgba(0,_0,_0,_0.5)]");
    expect(tailwindClass(["z-index", "3"])).toBe("[z-index:3]");
  });
});

describe("generateCode", () => {
  it("generates css with a rule per node", () => {
    const { doc, frame } = setup();
    const out = generateCode(doc.getNode(frame)!, (id) => doc.children(id), "css");
    expect(out).toContain(".card {");
    expect(out).toContain(".button {");
    expect(out).toContain("border-radius: 8px;");
  });

  it("escapes text in html and jsx", () => {
    const { doc, frame } = setup();
    const children = (id: string) => doc.children(id);
    expect(generateCode(doc.getNode(frame)!, children, "html")).toContain("Buy &lt;now&gt;");
    expect(generateCode(doc.getNode(frame)!, children, "react")).toContain("Buy &lt;now&gt;");
  });

  it("generates a React component and tailwind markup", () => {
    const { doc, frame } = setup();
    const children = (id: string) => doc.children(id);
    expect(generateCode(doc.getNode(frame)!, children, "react")).toMatch(/^export function Card\(\)/);
    expect(generateCode(doc.getNode(frame)!, children, "tailwind")).toContain("absolute left-[20px] top-[30px] w-[120px] h-[44px]");
  });
});

describe("multiple fills", () => {
  it("lists the top fill first and wraps upper solid colours in a gradient", () => {
    const css = backgroundCss([
      { type: "SOLID", color: "#ff0000", opacity: 1 },
      { type: "SOLID", color: "#0000ff", opacity: 0.5 },
    ]);
    expect(css).toBe("linear-gradient(rgba(0, 0, 255, 0.5), rgba(0, 0, 255, 0.5)), #ff0000");
  });
  it("keeps a single solid fill as a plain colour", () => {
    expect(backgroundCss([{ type: "SOLID", color: "#ff0000", opacity: 1 }])).toBe("#ff0000");
  });
});

describe("fill container in CSS", () => {
  function row(layout: "HORIZONTAL" | "VERTICAL") {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const frame = doc.createNode("FRAME", { parentId: page, props: { width: 300, height: 100 } });
    doc.setStyle(frame, { layoutMode: layout, primarySizing: "FIXED", counterSizing: "FIXED" } as never);
    const kid = doc.createNode("RECTANGLE", { parentId: frame, props: { width: 50, height: 20 } });
    doc.setStyle(kid, { layoutSizingH: "FILL", layoutSizingV: "FILL" } as never);
    return generateCode(doc.getNode(frame)!, (id) => doc.children(id), "css");
  }

  it("grows along the main axis and stretches across it in a row", () => {
    const css = row("HORIZONTAL");
    expect(css).toContain("flex: 1 1 0");
    expect(css).toContain("align-self: stretch");
    const kidRule = css.slice(css.indexOf("Rectangle") >= 0 ? css.indexOf("Rectangle") : css.lastIndexOf("{"));
    expect(kidRule).not.toMatch(/width: 50px/);
    expect(kidRule).not.toMatch(/height: 20px/);
  });

  it("uses the vertical axis as the main axis in a column", () => {
    expect(row("VERTICAL")).toContain("flex: 1 1 0");
  });

  it("keeps fixed sizes without fill", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const frame = doc.createNode("FRAME", { parentId: page });
    doc.setStyle(frame, { layoutMode: "HORIZONTAL" } as never);
    doc.createNode("RECTANGLE", { parentId: frame, props: { width: 50, height: 20 } });
    const css = generateCode(doc.getNode(frame)!, (id) => doc.children(id), "css");
    expect(css).toContain("width: 50px");
    expect(css).not.toContain("flex: 1 1 0");
  });
});

describe("wrapping auto layout in CSS", () => {
  it("emits flex-wrap and the line gap", () => {
    const doc = new DesignDoc();
    const frame = doc.createNode("FRAME", { parentId: doc.pages()[0]!.id });
    doc.setStyle(frame, { layoutMode: "HORIZONTAL", layoutWrap: true, itemSpacing: 8, counterSpacing: 16 } as never);
    doc.createNode("RECTANGLE", { parentId: frame });
    const css = generateCode(doc.getNode(frame)!, (id) => doc.children(id), "css");
    expect(css).toContain("flex-wrap: wrap");
    expect(css).toContain("gap: 16px 8px");
  });
});

describe("absolute children of auto layout in CSS", () => {
  it("are positioned absolutely instead of in the flex flow", () => {
    const doc = new DesignDoc();
    const frame = doc.createNode("FRAME", { parentId: doc.pages()[0]!.id });
    doc.setStyle(frame, { layoutMode: "HORIZONTAL" } as never);
    const badge = doc.createNode("RECTANGLE", { parentId: frame, props: { name: "Badge", width: 10, height: 10 } });
    doc.setStyle(badge, { layoutPositioning: "ABSOLUTE" } as never);
    doc.setPosition(badge, 7, 9);
    const css = generateCode(doc.getNode(frame)!, (id) => doc.children(id), "css");
    expect(css).toContain("position: absolute");
    expect(css).toContain("left: 7px");
    expect(css).toContain("top: 9px");
  });
});

describe("individual stroke sides", () => {
  it("emits border-width per side", () => {
    const doc = new DesignDoc();
    const id = doc.createNode("RECTANGLE", { parentId: doc.pages()[0]!.id, props: { width: 10, height: 10, strokes: [{ type: "SOLID", color: "#000000", opacity: 1 }], strokeWidth: 1, strokeSides: [1, 0, 2, 0] } as never });
    expect(declarations(doc.getNode(id)!)).toContainEqual(["border-width", "1px 0px 2px 0px"]);
  });
});

describe("background blur", () => {
  it("emits backdrop-filter", () => {
    const doc = new DesignDoc();
    const id = doc.createNode("RECTANGLE", { parentId: doc.pages()[0]!.id, props: { width: 10, height: 10, effects: [{ type: "BACKGROUND_BLUR", radius: 8, visible: true }] } as never });
    expect(declarations(doc.getNode(id)!)).toContainEqual(["backdrop-filter", "blur(8px)"]);
  });
});

describe("shadow spread", () => {
  it("puts the spread after the blur in box-shadow", () => {
    const doc = new DesignDoc();
    const id = doc.createNode("RECTANGLE", { parentId: doc.pages()[0]!.id, props: { width: 10, height: 10, effects: [{ type: "DROP_SHADOW", x: 0, y: 4, blur: 8, spread: 2, color: "#000000", opacity: 0.25, visible: true }] } as never });
    expect(declarations(doc.getNode(id)!).find(([p]) => p === "box-shadow")![1]).toBe("0px 4px 8px 2px rgba(0, 0, 0, 0.25)");
  });
});

describe("angular and diamond gradient css", () => {
  it("uses conic-gradient and a radial stand-in", () => {
    const stops = [{ position: 0, color: "#ff0000", opacity: 1 }, { position: 1, color: "#0000ff", opacity: 1 }];
    expect(paintCss({ type: "GRADIENT_ANGULAR", stops, angle: 0, opacity: 1 })).toMatch(/^conic-gradient\(from 90deg, /);
    expect(paintCss({ type: "GRADIENT_DIAMOND", stops, angle: 0, opacity: 1 })).toMatch(/^radial-gradient\(closest-side, /);
  });
});

describe("tiled image fills", () => {
  it("repeats the picture at its own size times the tile scale", () => {
    expect(paintCss({ type: "IMAGE", assetId: "a", scaleMode: "TILE", imageWidth: 32, imageHeight: 16, tileScale: 2, opacity: 1 })).toBe("url(image) 0 0 / 64px 32px repeat");
    expect(paintCss({ type: "IMAGE", assetId: "a", scaleMode: "TILE", opacity: 1 })).toBe("url(image) 0 0 / 256px 256px repeat");
    expect(paintCss({ type: "IMAGE", assetId: "a", scaleMode: "FIT", opacity: 1 })).toBe("url(image) center / contain no-repeat");
    expect(paintCss({ type: "IMAGE", assetId: "a", scaleMode: "CROP", cropZoom: 1.5, cropX: 12, cropY: -4, opacity: 1 })).toBe("url(image) calc(50% + 12px) calc(50% + -4px) / 150% auto no-repeat");
  });
});

describe("SwiftUI", () => {
  it("makes a View struct with a ZStack, offsets, a rounded fill and a font", () => {
    const { doc, frame } = setup();
    const code = generateCode(doc.getNode(frame)!, (id) => doc.children(id), "swiftui");
    expect(code).toContain("import SwiftUI");
    expect(code).toContain("struct Card: View {");
    expect(code).toContain("ZStack(alignment: .topLeading) {");
    expect(code).toContain("RoundedRectangle(cornerRadius: 8).fill(Color(red: 0.22, green: 0.545, blue: 1))");
    expect(code).toContain(".offset(x: 20, y: 30)");
    expect(code).toContain('Text("Buy <now>")');
    expect(code).toContain(".fontWeight(.semibold)");
    expect(code).toContain(".frame(width: 300, height: 200, alignment: .topLeading)");
  });

  it("turns auto layout into stacks with spacing and padding", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const row = doc.createNode("FRAME", { parentId: page, props: { name: "Row", width: 200, height: 40, layoutMode: "HORIZONTAL", itemSpacing: 12, paddingTop: 4, paddingRight: 8, paddingBottom: 4, paddingLeft: 8, counterAxisAlign: "CENTER" } as never });
    doc.createNode("ELLIPSE", { parentId: row, props: { name: "Dot", width: 10, height: 10, fills: [{ type: "SOLID", color: "#ff0000", opacity: 0.5 }] } });
    const code = generateCode(doc.getNode(row)!, (id) => doc.children(id), "swiftui");
    expect(code).toContain("HStack(alignment: .center, spacing: 12) {");
    expect(code).toContain(".padding(EdgeInsets(top: 4, leading: 8, bottom: 4, trailing: 8))");
    expect(code).toContain("Ellipse().fill(Color(red: 1, green: 0, blue: 0).opacity(0.5))");
    expect(code).not.toContain(".offset(");
  });

  it("writes gradients, strokes and drop shadows", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const id = doc.createNode("RECTANGLE", {
      parentId: page,
      props: {
        name: "Banner",
        width: 100,
        height: 50,
        fills: [{ type: "GRADIENT_LINEAR", angle: 90, opacity: 1, stops: [{ position: 0, color: "#000000", opacity: 1 }, { position: 1, color: "#ffffff", opacity: 1 }] }],
        strokes: [{ type: "SOLID", color: "#00ff00", opacity: 1 }],
        strokeWidth: 2,
        effects: [{ type: "DROP_SHADOW", x: 0, y: 4, blur: 8, color: "#000000", opacity: 0.25, visible: true }],
      } as never,
    });
    const code = generateCode(doc.getNode(id)!, (i) => doc.children(i), "swiftui");
    expect(code).toContain("LinearGradient(gradient: Gradient(stops: [.init(color: Color(red: 0, green: 0, blue: 0), location: 0), .init(color: Color(red: 1, green: 1, blue: 1), location: 1)]), startPoint: UnitPoint(x: 0.5, y: 0), endPoint: UnitPoint(x: 0.5, y: 1))");
    expect(code).toContain(".overlay(Rectangle().stroke(Color(red: 0, green: 1, blue: 0), lineWidth: 2))");
    expect(code).toContain(".shadow(color: Color(red: 0, green: 0, blue: 0).opacity(0.25), radius: 4, x: 0, y: 4)");
  });

  it("escapes quotes and new lines in text", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const id = doc.createNode("TEXT", { parentId: page, props: { name: "T", characters: 'Say "hi"\nthere\\' } });
    expect(generateCode(doc.getNode(id)!, (i) => doc.children(i), "swiftui")).toContain('Text("Say \\"hi\\"\\nthere\\\\")');
  });

  it("never names the struct after a SwiftUI type or starts it with a digit", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const a = doc.createNode("RECTANGLE", { parentId: page, props: { name: "Rectangle", width: 10, height: 10 } });
    const b = doc.createNode("FRAME", { parentId: page, props: { name: "2 columns", width: 10, height: 10 } });
    expect(generateCode(doc.getNode(a)!, (i) => doc.children(i), "swiftui")).toContain("struct RectangleView: View {");
    expect(generateCode(doc.getNode(b)!, (i) => doc.children(i), "swiftui")).toContain("struct V2Columns: View {");
  });
});

describe("Jetpack Compose", () => {
  it("makes a composable with a Box, offsets, a rounded background and text arguments", () => {
    const { doc, frame } = setup();
    const code = generateCode(doc.getNode(frame)!, (id) => doc.children(id), "compose");
    expect(code).toContain("@Composable\nfun Card() {");
    expect(code).toContain("import androidx.compose.material3.Text");
    expect(code).toContain(".offset(x = 20.dp, y = 30.dp)");
    expect(code).toContain(".size(120.dp, 44.dp)");
    expect(code).toContain(".background(Color(0xFF388BFF), RoundedCornerShape(8.dp))");
    expect(code).toContain('text = "Buy <now>",');
    expect(code).toContain("fontWeight = FontWeight.SemiBold,");
  });

  it("turns auto layout into Row / Column with spacing and padding", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const row = doc.createNode("FRAME", { parentId: page, props: { name: "Row", width: 200, height: 40, layoutMode: "HORIZONTAL", itemSpacing: 12, paddingTop: 4, paddingRight: 8, paddingBottom: 4, paddingLeft: 8, counterAxisAlign: "CENTER" } as never });
    doc.createNode("ELLIPSE", { parentId: row, props: { name: "Dot", width: 10, height: 10, fills: [{ type: "SOLID", color: "#ff0000", opacity: 0.5 }] } });
    const code = generateCode(doc.getNode(row)!, (id) => doc.children(id), "compose");
    expect(code).toContain("fun RowLayout() {");
    expect(code).toContain("horizontalArrangement = Arrangement.spacedBy(12.dp),");
    expect(code).toContain("verticalAlignment = Alignment.CenterVertically");
    expect(code).toContain(".padding(start = 8.dp, top = 4.dp, end = 8.dp, bottom = 4.dp)");
    expect(code).toContain(".background(Color(0x80FF0000), CircleShape)");
    expect(code).not.toContain(".offset(");
  });

  it("writes gradients, borders and shadows, and escapes strings", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const id = doc.createNode("RECTANGLE", {
      parentId: page,
      props: {
        name: "Banner",
        width: 100,
        height: 50,
        fills: [{ type: "GRADIENT_LINEAR", angle: 90, opacity: 1, stops: [{ position: 0, color: "#000000", opacity: 1 }, { position: 1, color: "#ffffff", opacity: 1 }] }],
        strokes: [{ type: "SOLID", color: "#00ff00", opacity: 1 }],
        strokeWidth: 2,
        effects: [{ type: "DROP_SHADOW", x: 0, y: 4, blur: 8, color: "#000000", opacity: 0.25, visible: true }],
      } as never,
    });
    const code = generateCode(doc.getNode(id)!, (i) => doc.children(i), "compose");
    expect(code).toContain(".background(Brush.linearGradient(0f to Color(0xFF000000), 1f to Color(0xFFFFFFFF), start = Offset(50f, 0f), end = Offset(50f, 50f)), RectangleShape)");
    expect(code).toContain(".border(2.dp, Color(0xFF00FF00), RectangleShape)");
    expect(code).toContain(".shadow(elevation = 4.dp, shape = RectangleShape, ambientColor = Color(0x40000000), spotColor = Color(0x40000000))");
    const t = doc.createNode("TEXT", { parentId: page, props: { name: "T", characters: 'Cost $5 "x"\n' } });
    expect(generateCode(doc.getNode(t)!, (i) => doc.children(i), "compose")).toContain('text = "Cost \\$5 \\"x\\"\\n",');
  });
});

describe("grid flow CSS", () => {
  it("is a CSS grid with a fixed number of columns", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const id = doc.createNode("FRAME", { parentId: page, props: { name: "Grid", width: 200, height: 100, layoutMode: "HORIZONTAL", layoutWrap: true, gridColumns: 3, itemSpacing: 8, counterSpacing: 4, paddingTop: 2, paddingRight: 2, paddingBottom: 2, paddingLeft: 2, primaryAxisAlign: "CENTER" } as never });
    const decls = declarations(doc.getNode(id)!, {});
    const get = (k: string) => decls.find(([p]) => p === k)?.[1];
    expect(get("display")).toBe("grid");
    expect(get("grid-template-columns")).toBe("repeat(3, max-content)");
    expect(get("gap")).toBe("4px 8px");
    expect(get("justify-items")).toBe("center");
    expect(get("flex-direction")).toBeUndefined();
  });
  it("without columns the wrap stays a flex layout", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const id = doc.createNode("FRAME", { parentId: page, props: { name: "Wrap", width: 200, height: 100, layoutMode: "HORIZONTAL", layoutWrap: true } as never });
    expect(declarations(doc.getNode(id)!, {}).find(([p]) => p === "display")?.[1]).toBe("flex");
  });
});

describe("UIKit", () => {
  it("makes a UIView subclass that builds frames, a label and a rounded view in setup()", () => {
    const { doc, frame } = setup();
    const code = generateCode(doc.getNode(frame)!, (id) => doc.children(id), "uikit");
    expect(code).toContain("import UIKit");
    expect(code).toContain("final class Card: UIView {");
    expect(code).toContain("private func setup() {");
    expect(code).toContain("let button = UIView()");
    expect(code).toContain("button.backgroundColor = UIColor(red: 0.22, green: 0.545, blue: 1, alpha: 1)");
    expect(code).toContain("button.layer.cornerRadius = 8");
    expect(code).toContain("button.frame = CGRect(x: 20, y: 30, width: 120, height: 44)");
    expect(code).toContain("addSubview(button)");
    expect(code).toContain("let buyNow = UILabel()");
    expect(code).toContain('buyNow.text = "Buy <now>"');
    expect(code).toContain(".semibold");
  });

  it("turns auto layout into a UIStackView with spacing and margins", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const row = doc.createNode("FRAME", { parentId: page, props: { name: "Row", width: 200, height: 40, layoutMode: "HORIZONTAL", itemSpacing: 12, paddingTop: 4, paddingRight: 8, paddingBottom: 4, paddingLeft: 8, counterAxisAlign: "CENTER" } as never });
    const inner = doc.createNode("FRAME", { parentId: row, props: { name: "Chip", width: 30, height: 20, layoutMode: "VERTICAL", paddingLeft: 3 } as never });
    doc.createNode("ELLIPSE", { parentId: inner, props: { name: "Dot", width: 10, height: 10, fills: [{ type: "SOLID", color: "#ff0000", opacity: 0.5 }] } });
    const code = generateCode(doc.getNode(row)!, (id) => doc.children(id), "uikit");
    expect(code).toContain("let stack = UIStackView()");
    expect(code).toContain("stack.axis = .horizontal");
    expect(code).toContain("stack.spacing = 12");
    expect(code).toContain("let chip = UIStackView()");
    expect(code).toContain("chip.axis = .vertical");
    expect(code).toContain("chip.isLayoutMarginsRelativeArrangement = true");
    expect(code).toContain("stack.addArrangedSubview(chip)");
    expect(code).toContain("dot.layer.cornerRadius = 5");
    expect(code).toContain("chip.addArrangedSubview(dot)");
    expect(code).toContain("stack.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 8)");
    // the chip hugs its content: 3 of margin plus the 10 wide dot
    expect(code).toContain("chip.widthAnchor.constraint(equalToConstant: 13).isActive = true");
  });

  it("writes gradients, borders and shadows", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const parent = doc.createNode("FRAME", { parentId: page, props: { name: "Host", width: 200, height: 100 } });
    doc.createNode("RECTANGLE", {
      parentId: parent,
      props: {
        name: "Banner",
        width: 100,
        height: 50,
        opacity: 0.5,
        fills: [{ type: "GRADIENT_LINEAR", angle: 90, opacity: 1, stops: [{ position: 0, color: "#000000", opacity: 1 }, { position: 1, color: "#ffffff", opacity: 1 }] }],
        strokes: [{ type: "SOLID", color: "#00ff00", opacity: 1 }],
        strokeWidth: 2,
        effects: [{ type: "DROP_SHADOW", x: 0, y: 4, blur: 8, color: "#000000", opacity: 0.25, visible: true }],
      } as never,
    });
    const code = generateCode(doc.getNode(parent)!, (i) => doc.children(i), "uikit");
    expect(code).toContain("let bannerGradient = CAGradientLayer()");
    expect(code).toContain("bannerGradient.startPoint = CGPoint(x: 0.5, y: 0)");
    expect(code).toContain("bannerGradient.endPoint = CGPoint(x: 0.5, y: 1)");
    expect(code).toContain("banner.layer.insertSublayer(bannerGradient, at: 0)");
    expect(code).toContain("banner.layer.borderWidth = 2");
    expect(code).toContain("banner.layer.shadowOpacity = 0.25");
    expect(code).toContain("banner.layer.shadowRadius = 4");
    expect(code).toContain("banner.alpha = 0.5");
  });

  it("escapes text, avoids UIKit class names, and gives repeated names unique variables", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const root = doc.createNode("FRAME", { parentId: page, props: { name: "UIView", width: 100, height: 100 } });
    doc.createNode("TEXT", { parentId: root, props: { name: "T", characters: 'Say "hi"' } });
    doc.createNode("TEXT", { parentId: root, props: { name: "T", characters: 'Say "hi"' } });
    const code = generateCode(doc.getNode(root)!, (i) => doc.children(i), "uikit");
    expect(code).toContain("final class UIViewView: UIView {");
    expect(code).toContain('.text = "Say \\"hi\\""');
    expect(code).toContain("let sayHi = UILabel()");
    expect(code).toContain("let sayHi2 = UILabel()");
  });

  it("a single text layer becomes the only subview", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const id = doc.createNode("TEXT", { parentId: page, props: { name: "Title", characters: "Hi" } });
    const code = generateCode(doc.getNode(id)!, (i) => doc.children(i), "uikit");
    expect(code).toContain("final class Title: UIView {");
    expect(code).toContain("addSubview(");
  });
});

describe("Android XML", () => {
  it("makes a FrameLayout with margins and a drawable for the rounded fill", () => {
    const { doc, frame } = setup();
    const code = generateCode(doc.getNode(frame)!, (id) => doc.children(id), "androidxml");
    expect(code).toContain("<!-- res/layout/card.xml -->");
    expect(code).toContain("<FrameLayout");
    expect(code).toContain('xmlns:android="http://schemas.android.com/apk/res/android"');
    expect(code).toContain('android:layout_width="300dp"');
    expect(code).toContain('android:layout_marginStart="20dp"');
    expect(code).toContain('android:layout_marginTop="30dp"');
    expect(code).toContain('android:background="@drawable/button_bg"');
    expect(code).toContain("<!-- res/drawable/button_bg.xml -->");
    expect(code).toContain('<solid android:color="#FF388BFF" />');
    expect(code).toContain('<corners android:radius="8dp" />');
    expect(code).toContain('android:text="Buy &lt;now&gt;"');
    expect(code).toContain('android:textStyle="bold"');
    expect(code).toContain('android:textSize="16sp"');
  });

  it("turns auto layout into a LinearLayout with padding, gravity and gap margins", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const row = doc.createNode("FRAME", { parentId: page, props: { name: "Row", width: 200, height: 40, layoutMode: "HORIZONTAL", itemSpacing: 12, paddingTop: 4, paddingRight: 8, paddingBottom: 4, paddingLeft: 8, counterAxisAlign: "CENTER" } as never });
    doc.createNode("ELLIPSE", { parentId: row, props: { name: "Dot", width: 10, height: 10, fills: [{ type: "SOLID", color: "#ff0000", opacity: 0.5 }] } });
    doc.createNode("ELLIPSE", { parentId: row, props: { name: "Dot", width: 10, height: 10, fills: [{ type: "SOLID", color: "#00ff00", opacity: 1 }] } });
    const code = generateCode(doc.getNode(row)!, (id) => doc.children(id), "androidxml");
    expect(code).toContain("<LinearLayout");
    expect(code).toContain('android:orientation="horizontal"');
    expect(code).toContain('android:paddingStart="8dp"');
    expect(code).toContain('android:gravity="start|center_vertical"');
    expect(code.match(/android:layout_marginStart="12dp"/g)).toHaveLength(1); // only the second dot
    expect(code).toContain('<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="oval">');
    expect(code).toContain('<solid android:color="#80FF0000" />');
    expect(code).toContain("res/drawable/dot_2_bg.xml");
  });

  it("writes gradients, strokes and elevation, and snaps the gradient angle", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const id = doc.createNode("RECTANGLE", {
      parentId: page,
      props: {
        name: "Banner",
        width: 100,
        height: 50,
        fills: [{ type: "GRADIENT_LINEAR", angle: 90, opacity: 1, stops: [{ position: 0, color: "#000000", opacity: 1 }, { position: 0.5, color: "#888888", opacity: 1 }, { position: 1, color: "#ffffff", opacity: 1 }] }],
        strokes: [{ type: "SOLID", color: "#00ff00", opacity: 1 }],
        strokeWidth: 2,
        effects: [{ type: "DROP_SHADOW", x: 0, y: 4, blur: 8, color: "#000000", opacity: 0.25, visible: true }],
      } as never,
    });
    const code = generateCode(doc.getNode(id)!, (i) => doc.children(i), "androidxml");
    expect(code).toContain('android:startColor="#FF000000"');
    expect(code).toContain('android:centerColor="#FF888888"');
    expect(code).toContain('android:endColor="#FFFFFFFF"');
    expect(code).toContain('android:angle="270"'); // top to bottom in Farsha is 270 for Android
    expect(code).toContain('<stroke android:width="2dp" android:color="#FF00FF00" />');
    expect(code).toContain('android:elevation="4dp"');
  });

  it("a single text layer is its own TextView with the namespace on it", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const id = doc.createNode("TEXT", { parentId: page, props: { name: "Title", characters: "Hi" } });
    const code = generateCode(doc.getNode(id)!, (i) => doc.children(i), "androidxml");
    expect(code).toMatch(/<TextView\s+xmlns:android=/);
  });
});

describe("stroke position in CSS", () => {
  const make = (strokeAlign: string, extra: Record<string, unknown> = {}) => {
    const doc = new DesignDoc();
    const id = doc.createNode("RECTANGLE", { parentId: doc.pages()[0]!.id, props: { width: 10, height: 10, strokes: [{ type: "SOLID", color: "#ff0000", opacity: 1 }], strokeWidth: 4, strokeAlign, ...extra } as never });
    return Object.fromEntries(declarations(doc.getNode(id)!));
  };
  it("inside strokes are a border", () => {
    expect(make("INSIDE")).toMatchObject({ border: "4px solid #ff0000", "box-sizing": "border-box" });
    expect(make("INSIDE")).not.toHaveProperty("outline");
  });
  it("outside strokes are an outline and no border", () => {
    const d = make("OUTSIDE");
    expect(d.outline).toBe("4px solid #ff0000");
    expect(d).not.toHaveProperty("border");
  });
  it("centred strokes are half border and half outline", () => {
    const d = make("CENTER");
    expect(d.border).toBe("2px solid #ff0000");
    expect(d.outline).toBe("2px solid #ff0000");
  });
  it("dashes carry over to outline and border", () => {
    const d = make("OUTSIDE", { strokeDash: [8, 4] });
    expect(d.outline).toBe("4px dashed #ff0000");
  });
  it("Tailwind writes an outline", () => {
    expect(tailwindClass(["outline", "4px solid #ff0000"])).toContain("outline-[4px]");
  });
});
