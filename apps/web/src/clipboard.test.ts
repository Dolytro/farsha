import { beforeEach, describe, expect, it } from "vitest";
import { DesignDoc } from "@canvylo/design-core";
import { armPasteMode, copyNodes, copyProperties, hasCopiedProperties, parseClip, pasteProperties, pasteNodes, pasteOver, pasteReplace, pasteTarget, pasteText, resetClipboardState, selectAllIn, takePasteMode } from "./clipboard";

function setup() {
  const doc = new DesignDoc();
  const page = doc.pages()[0]!.id;
  const frame = doc.createNode("FRAME", { parentId: page, props: { name: "Card", x: 100, y: 100, width: 300, height: 200 } });
  const rect = doc.createNode("RECTANGLE", { parentId: frame, props: { name: "Box", x: 10, y: 20, width: 50, height: 40 } });
  const text = doc.createNode("TEXT", { parentId: frame, props: { name: "Label", characters: "Hello", x: 5, y: 80 } });
  return { doc, page, frame, rect, text };
}

beforeEach(() => resetClipboardState());

describe("copy and paste", () => {
  it("round-trips a frame with its children into a copy", () => {
    const { doc, page, frame } = setup();
    const clip = parseClip(copyNodes(doc, [frame])!)!;
    const [copy] = pasteNodes(doc, clip, page);

    expect(copy).toBeDefined();
    expect(copy).not.toBe(frame);
    expect(doc.getNode(copy!)).toMatchObject({ name: "Card", width: 300 });
    expect(doc.children(copy!).map((n) => n.name)).toEqual(["Box", "Label"]);
    expect(doc.children(frame)).toHaveLength(2); // original untouched
  });

  it("offsets a repeated paste into the same parent", () => {
    const { doc, page, frame } = setup();
    const clip = parseClip(copyNodes(doc, [frame])!)!;
    const [a] = pasteNodes(doc, clip, page);
    const [b] = pasteNodes(doc, clip, page);
    expect(doc.getNode(a!)).toMatchObject({ x: 116, y: 116 });
    expect(doc.getNode(b!)).toMatchObject({ x: 132, y: 132 });
  });

  it("keeps the position when pasting into a different parent", () => {
    const { doc, frame, rect } = setup();
    const clip = parseClip(copyNodes(doc, [rect])!)!;
    const [copy] = pasteNodes(doc, clip, frame);
    // same parent (the frame) as the source, so it is offset
    expect(doc.getNode(copy!)).toMatchObject({ x: 26, y: 36 });
    const other = doc.createNode("FRAME", { parentId: doc.pages()[0]!.id, props: { name: "Other" } });
    const [moved] = pasteNodes(doc, clip, other);
    expect(doc.getNode(moved!)).toMatchObject({ x: 10, y: 20 });
  });

  it("copies only the top-most layers of a selection", () => {
    const { doc, frame, rect } = setup();
    const clip = parseClip(copyNodes(doc, [frame, rect])!)!;
    expect(clip.nodes).toHaveLength(1);
    expect(clip.nodes[0]!.type).toBe("FRAME");
  });

  it("pastes as a single undo step", () => {
    const { doc, page, frame } = setup();
    doc.clearHistory();
    const clip = parseClip(copyNodes(doc, [frame])!)!;
    const [copy] = pasteNodes(doc, clip, page);
    doc.undo();
    expect(doc.hasNode(copy!)).toBe(false);
    expect(doc.children(page)).toHaveLength(1);
  });

  it("refuses to copy nothing or the page", () => {
    const { doc, page } = setup();
    expect(copyNodes(doc, [])).toBeNull();
    expect(copyNodes(doc, [page])).toBeNull();
  });

  it("ignores text that isn't a Canvylo payload", () => {
    expect(parseClip("hello")).toBeNull();
    expect(parseClip("canvylo:{not json")).toBeNull();
    expect(parseClip('canvylo:{"v":2,"nodes":[]}')).toBeNull();
  });

  it("skips layers the target cannot hold", () => {
    const { doc, frame, rect } = setup();
    const clip = parseClip(copyNodes(doc, [frame])!)!;
    expect(pasteNodes(doc, clip, rect)).toEqual([]);
  });
});

describe("paste over selection and paste to replace", () => {
  it("centres pasted layers on a selected plain layer", () => {
    const { doc, frame, rect, text } = setup();
    const clip = parseClip(copyNodes(doc, [text])!)!;
    const [id] = pasteOver(doc, clip, [rect])!;
    const pasted = doc.getNode(id!)!;
    const copied = doc.getNode(text)!;
    // rect: x10 y20 50x40 -> centre (35, 40); pasted box is centred on it
    expect(pasted.x + pasted.width / 2).toBeCloseTo(35);
    expect(pasted.y + pasted.height / 2).toBeCloseTo(40);
    expect(pasted.parentId).toBe(frame);
    expect(copied.x).toBe(5); // original untouched
  });

  it("pastes inside a selected frame, centred", () => {
    const { doc, page, frame, rect } = setup();
    const clip = parseClip(copyNodes(doc, [rect])!)!;
    const [id] = pasteOver(doc, clip, [frame])!;
    const pasted = doc.getNode(id!)!;
    expect(pasted.parentId).toBe(frame);
    expect(pasted.x + pasted.width / 2).toBeCloseTo(150); // frame is 300 wide
    expect(pasted.y + pasted.height / 2).toBeCloseTo(100); // and 200 tall
    expect(doc.getNode(frame)!.parentId).toBe(page);
  });

  it("returns null without a single selection", () => {
    const { doc, rect, text } = setup();
    const clip = parseClip(copyNodes(doc, [rect])!)!;
    expect(pasteOver(doc, clip, [])).toBeNull();
    expect(pasteOver(doc, clip, [rect, text])).toBeNull();
    expect(pasteReplace(doc, clip, [])).toBeNull();
  });

  it("replaces the selected layer, keeping its stacking position, in one undo step", () => {
    const { doc, frame, rect, text } = setup();
    const extra = doc.createNode("ELLIPSE", { parentId: frame, props: { name: "Dot", x: 0, y: 0, width: 10, height: 10 } });
    const clip = parseClip(copyNodes(doc, [extra])!)!;
    doc.clearHistory();
    const [id] = pasteReplace(doc, clip, [rect])!;
    expect(doc.hasNode(rect)).toBe(false);
    expect(doc.children(frame).map((n) => n.id)).toEqual([id, text, extra]);
    doc.undo();
    expect(doc.hasNode(rect)).toBe(true);
    expect(doc.children(frame).map((n) => n.id)).toEqual([rect, text, extra]);
  });

  it("arms and resets the paste mode", () => {
    armPasteMode("over");
    expect(takePasteMode()).toBe("over");
    expect(takePasteMode()).toBe("offset");
  });
});

describe("copy and paste properties", () => {
  const blue = [{ type: "SOLID" as const, color: "#0d99ff", opacity: 1 }];

  it("applies fill, stroke, radius and opacity to other layers", () => {
    const { doc, frame, rect } = setup();
    const source = doc.createNode("RECTANGLE", {
      parentId: frame,
      props: { name: "Source", fills: blue, strokes: [{ type: "SOLID", color: "#ff0000", opacity: 1 }], strokeWidth: 3, cornerRadius: 12, opacity: 0.5 },
    });
    expect(copyProperties(doc, source)).toBe(true);
    expect(pasteProperties(doc, [rect])).toBe(1);
    expect(doc.getNode(rect)).toMatchObject({ fills: blue, strokeWidth: 3, cornerRadius: 12, opacity: 0.5 });
    expect(doc.getNode(rect)).toMatchObject({ x: 10, y: 20, width: 50, height: 40 }); // geometry untouched
  });

  it("skips properties the target does not have", () => {
    const { doc, frame, rect } = setup();
    const dot = doc.createNode("ELLIPSE", { parentId: frame, props: { name: "Dot" } });
    copyProperties(doc, rect);
    doc.setStyle(rect, { cornerRadius: 9 });
    copyProperties(doc, rect);
    pasteProperties(doc, [dot]);
    expect(doc.getNode(dot)).not.toHaveProperty("cornerRadius"); // ellipses have no radius
  });

  it("copies text style between text layers and the fill onto shapes", () => {
    const { doc, frame, rect, text } = setup();
    const big = doc.createNode("TEXT", { parentId: frame, props: { name: "Big", characters: "Big", fontSize: 40, fontWeight: 800, fills: blue } });
    copyProperties(doc, big);
    pasteProperties(doc, [text, rect]);
    expect(doc.getNode(text)).toMatchObject({ fontSize: 40, fontWeight: 800, fills: blue, characters: "Hello" });
    expect(doc.getNode(rect)).toMatchObject({ fills: blue });
    expect(doc.getNode(rect)).not.toHaveProperty("fontSize");
  });

  it("is one undo step and does nothing without a copy", () => {
    const { doc, frame, rect } = setup();
    expect(hasCopiedProperties()).toBe(false);
    expect(pasteProperties(doc, [rect])).toBe(0);
    const source = doc.createNode("RECTANGLE", { parentId: frame, props: { name: "S", fills: blue, opacity: 0.4 } });
    const before = doc.getNode(rect)!;
    copyProperties(doc, source);
    doc.clearHistory();
    pasteProperties(doc, [rect]);
    doc.undo();
    expect(doc.getNode(rect)).toMatchObject({ opacity: before.opacity, fills: (before as { fills: unknown }).fills });
  });
});

describe("paste target", () => {
  it("goes inside a selected frame, beside other layers, or onto the page", () => {
    const { doc, page, frame, rect } = setup();
    expect(pasteTarget(doc, [frame], page)).toBe(frame);
    expect(pasteTarget(doc, [rect], page)).toBe(frame);
    expect(pasteTarget(doc, [], page)).toBe(page);
    expect(pasteTarget(doc, [rect, frame], page)).toBe(page);
  });
});

describe("paste text and select all", () => {
  it("turns plain text into a text layer", () => {
    const { doc, page } = setup();
    const [id] = pasteText(doc, "  Some copied words  ", page, 40, 60);
    expect(doc.getNode(id!)).toMatchObject({ type: "TEXT", characters: "Some copied words", x: 40, y: 60 });
    expect(pasteText(doc, "   ", page, 0, 0)).toEqual([]);
  });

  it("selects visible, unlocked siblings", () => {
    const { doc, page, frame, rect, text } = setup();
    doc.setStyle(text, { locked: true });
    expect(selectAllIn(doc, [], page)).toEqual([frame]);
    expect(selectAllIn(doc, [rect], page)).toEqual([rect]);
  });
});
