import { describe, expect, it } from "vitest";
import { DesignDoc, defaultsFor } from "@canvylo/design-core";
import { declarations, generateCode, tailwindClass, toRgba } from "./index";

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
