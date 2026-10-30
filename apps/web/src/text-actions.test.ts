import { describe, expect, it } from "vitest";
import { DesignDoc } from "@canvylo/design-core";
import { applyTextCase, layoutText, textFontStyle, verticalTextOffset } from "@canvylo/canvas-engine";
import { setTextCase, setTextVerticalAlign, textLayersIn, toggleTextStyle } from "./text-actions";

function setup() {
  const doc = new DesignDoc();
  const page = doc.pages()[0]!.id;
  const frame = doc.createNode("FRAME", { parentId: page });
  const a = doc.createNode("TEXT", { parentId: frame, props: { characters: 'hello big world' } });
  const b = doc.createNode("TEXT", { parentId: frame, props: { characters: "second" } });
  const rect = doc.createNode("RECTANGLE", { parentId: frame });
  return { doc, page, frame, a, b, rect };
}
const text = (doc: DesignDoc, id: string) => doc.getNode(id) as unknown as Record<string, unknown>;

describe("text layers in a selection", () => {
  it("finds text inside selected frames and skips other layers", () => {
    const { doc, frame, a, b, rect } = setup();
    expect(textLayersIn(doc, [frame]).map((n) => n.id)).toEqual([a, b]);
    expect(textLayersIn(doc, [rect])).toEqual([]);
    expect(textLayersIn(doc, [a, frame]).length).toBe(2);
  });
});

describe("toggleTextStyle", () => {
  it("bold toggles between regular and bold", () => {
    const { doc, a } = setup();
    toggleTextStyle(doc, [a], "bold");
    expect(text(doc, a).fontWeight).toBe(700);
    toggleTextStyle(doc, [a], "bold");
    expect(text(doc, a).fontWeight).toBe(400);
  });

  it("italic, underline and strikethrough", () => {
    const { doc, a } = setup();
    toggleTextStyle(doc, [a], "italic");
    expect(text(doc, a).italic).toBe(true);
    toggleTextStyle(doc, [a], "underline");
    expect(text(doc, a).textDecoration).toBe("UNDERLINE");
    toggleTextStyle(doc, [a], "strikethrough");
    expect(text(doc, a).textDecoration).toBe("STRIKETHROUGH");
    toggleTextStyle(doc, [a], "strikethrough");
    expect(text(doc, a).textDecoration).toBe("NONE");
  });

  it("the first layer decides the direction for a mixed selection, as one undo step", () => {
    const { doc, a, b } = setup();
    doc.setText(b, { fontWeight: 700 });
    doc.stopCapturing();
    toggleTextStyle(doc, [a, b], "bold");
    expect(text(doc, a).fontWeight).toBe(700);
    expect(text(doc, b).fontWeight).toBe(700);
    doc.undo();
    expect(text(doc, a).fontWeight).toBe(400);
  });

  it("calls refit for every text layer", () => {
    const { doc, frame } = setup();
    const seen: string[] = [];
    toggleTextStyle(doc, [frame], "bold", (_d, id) => seen.push(id));
    expect(seen).toHaveLength(2);
  });
});

describe("case, vertical align and drawing helpers", () => {
  it("changes how the text is shown, not what was typed", () => {
    const { doc, a } = setup();
    setTextCase(doc, [a], "UPPER");
    expect(text(doc, a).characters).toBe("hello big world");
    expect(text(doc, a).textCase).toBe("UPPER");
    expect(layoutText(doc.getNode(a) as never).lines).toEqual(["HELLO BIG WORLD"]);
  });

  it("applyTextCase handles each mode", () => {
    expect(applyTextCase("Hello wORLD", "LOWER")).toBe("hello world");
    expect(applyTextCase("hello-big world", "TITLE")).toBe("Hello-Big World");
    expect(applyTextCase("keep me", undefined)).toBe("keep me");
    expect(applyTextCase("keep me", "NONE")).toBe("keep me");
  });

  it("vertical alignment only matters in a fixed box", () => {
    expect(verticalTextOffset({ height: 100, textVerticalAlign: "CENTER", textAutoResize: "NONE" }, 20)).toBe(40);
    expect(verticalTextOffset({ height: 100, textVerticalAlign: "BOTTOM", textAutoResize: "NONE" }, 20)).toBe(80);
    expect(verticalTextOffset({ height: 100, textVerticalAlign: "TOP", textAutoResize: "NONE" }, 20)).toBe(0);
    expect(verticalTextOffset({ height: 100, textVerticalAlign: "CENTER" }, 20)).toBe(0);
    const { doc, a } = setup();
    setTextVerticalAlign(doc, [a], "CENTER");
    expect(text(doc, a).textVerticalAlign).toBe("CENTER");
  });

  it("font style attributes", () => {
    expect(textFontStyle({})).toEqual({});
    expect(textFontStyle({ italic: true, textDecoration: "UNDERLINE" })).toEqual({ fontStyle: "italic", textDecoration: "underline" });
    expect(textFontStyle({ textDecoration: "STRIKETHROUGH" })).toEqual({ textDecoration: "line-through" });
  });
});
