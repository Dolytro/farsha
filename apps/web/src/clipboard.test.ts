import { beforeEach, describe, expect, it } from "vitest";
import { DesignDoc } from "@canvylo/design-core";
import { copyNodes, parseClip, pasteNodes, pasteTarget, pasteText, resetClipboardState, selectAllIn } from "./clipboard";

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
