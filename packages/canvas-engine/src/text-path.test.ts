import { describe, expect, it } from "vitest";
import { DesignDoc } from "@canvylo/design-core";
import { exportSvg } from "./svg-export";
import { textPathData } from "./text-path";

function setup() {
  const doc = new DesignDoc();
  const frame = doc.createNode("FRAME", { parentId: doc.pages()[0]!.id, props: { width: 400, height: 300 } });
  const curve = doc.createNode("VECTOR", {
    parentId: frame,
    props: {
      x: 100,
      y: 50,
      width: 200,
      height: 100,
      viewBox: "0 0 200 100",
      markup: "",
      penPoints: [
        { x: 0, y: 100, hx: 0, hy: 0 },
        { x: 200, y: 0, hx: 0, hy: 0 },
      ],
      penClosed: false,
      fills: [],
      strokes: [],
      strokeWidth: 1,
    } as never,
  });
  const text = doc.createNode("TEXT", { parentId: frame, props: { x: 100, y: 50, width: 200, characters: "Along the curve", textPathId: curve } as never });
  return { doc, frame, curve, text };
}

describe("textPathData", () => {
  it("gives the path in the text layer's own coordinates", () => {
    const { doc, text } = setup();
    expect(textPathData(doc, doc.getNode(text)!)).toBe("M0 100 L200 0");
    doc.setPosition(text, 90, 40);
    expect(textPathData(doc, doc.getNode(text)!)).toBe("M10 110 L210 10");
  });

  it("follows the path when the vector is resized", () => {
    const { doc, curve, text } = setup();
    doc.resizeNode(curve, { width: 400 });
    expect(textPathData(doc, doc.getNode(text)!)).toContain("L400 0");
  });

  it("needs a pen path in the same parent, and no rotation", () => {
    const { doc, frame, curve, text } = setup();
    expect(textPathData(doc, doc.getNode(curve)!)).toBeNull();
    doc.setStyle(text, { textPathId: "missing" } as never);
    expect(textPathData(doc, doc.getNode(text)!)).toBeNull();
    doc.setText(text, { textPathId: curve });
    doc.rotateNode(text, 20);
    expect(textPathData(doc, doc.getNode(text)!)).toBeNull();
    doc.rotateNode(text, 0);
    const other = doc.createNode("FRAME", { parentId: doc.pages()[0]!.id });
    doc.reparentNode(curve, other);
    expect(textPathData(doc, doc.getNode(text)!)).toBeNull();
    expect(frame).toBeTruthy();
  });
});

describe("text on a path in an export", () => {
  it("writes a textPath along the curve, aligned by the layer's alignment", () => {
    const { doc, text } = setup();
    let svg = exportSvg(doc, [text])!.svg;
    expect(svg).toContain('<path id="tp-');
    expect(svg).toContain("<textPath");
    expect(svg).toContain("Along the curve</textPath>");
    expect(svg).not.toContain("<tspan");
    doc.setText(text, { textAlign: "CENTER" });
    svg = exportSvg(doc, [text])!.svg;
    expect(svg).toContain('startOffset="50%" text-anchor="middle"');
  });
});
