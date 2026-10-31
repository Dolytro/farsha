import { describe, expect, it } from "vitest";
import { DesignDoc } from "@farsha/design-core";
import { replaceSelectionColor, selectionColors } from "./colors";

const solid = (color: string) => [{ type: "SOLID" as const, color, opacity: 1 }];

function setup() {
  const doc = new DesignDoc();
  const page = doc.pages()[0]!.id;
  const frame = doc.createNode("FRAME", { parentId: page, props: { fills: solid("#FFFFFF") } });
  const a = doc.createNode("RECTANGLE", { parentId: frame, props: { fills: solid("#ff0000"), strokes: solid("#000000") } });
  const b = doc.createNode("ELLIPSE", { parentId: frame, props: { fills: solid("#FF0000") } });
  const t = doc.createNode("TEXT", { parentId: frame, props: { fills: solid("#000000") } });
  return { doc, page, frame, a, b, t };
}

describe("selectionColors", () => {
  it("lists the solid colours inside the selection, most used first, case-insensitively", () => {
    const { doc, frame } = setup();
    expect(selectionColors(doc, [frame])).toEqual([
      { color: "#000000", count: 2 },
      { color: "#ff0000", count: 2 },
      { color: "#ffffff", count: 1 },
    ]);
  });

  it("only looks inside what is selected and skips gradients and variable-bound paints", () => {
    const { doc, a } = setup();
    doc.setStyle(a, { fills: [{ type: "GRADIENT_LINEAR", stops: [], angle: 0, opacity: 1 }] });
    expect(selectionColors(doc, [a])).toEqual([{ color: "#000000", count: 1 }]);
    const v = doc.createColorVariable("Brand", "#123456");
    doc.setStyle(a, { strokes: solid("#abcdef") });
    doc.bindPaintVariable(a, "strokes", 0, v);
    expect(selectionColors(doc, [a])).toEqual([]);
  });
});

describe("replaceSelectionColor", () => {
  it("changes a colour in fills and strokes across the selection, as one undo step", () => {
    const { doc, frame, a, b } = setup();
    doc.stopCapturing();
    expect(replaceSelectionColor(doc, [frame], "#FF0000", "#00ff00")).toBe(2);
    expect((doc.getNode(a) as unknown as { fills: { color: string }[] }).fills[0]!.color).toBe("#00ff00");
    expect((doc.getNode(b) as unknown as { fills: { color: string }[] }).fills[0]!.color).toBe("#00ff00");
    expect(selectionColors(doc, [frame]).map((c) => c.color)).not.toContain("#ff0000");
    doc.undo();
    expect((doc.getNode(a) as unknown as { fills: { color: string }[] }).fills[0]!.color).toBe("#ff0000");
  });

  it("rejects colours that are not six-digit hex", () => {
    const { doc, frame } = setup();
    expect(replaceSelectionColor(doc, [frame], "#ff0000", "red")).toBe(0);
    expect(replaceSelectionColor(doc, [frame], "#ff0000", "#f00")).toBe(0);
  });
});
