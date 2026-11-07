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
  });
});
