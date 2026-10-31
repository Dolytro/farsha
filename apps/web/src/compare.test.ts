import { describe, expect, it } from "vitest";
import { DesignDoc } from "@canvylo/design-core";
import { compareDocs, hasChanges } from "./compare";

function setup() {
  const doc = new DesignDoc();
  const page = doc.pages()[0]!.id;
  const frame = doc.createNode("FRAME", { parentId: page, props: { name: "Card", width: 200, height: 100 } });
  const rect = doc.createNode("RECTANGLE", { parentId: frame, props: { name: "Bg", fills: [{ type: "SOLID", color: "#ffffff", opacity: 1 }] } });
  const text = doc.createNode("TEXT", { parentId: frame, props: { name: "Title", characters: "Hello" } });
  return { doc, page, frame, rect, text };
}

describe("compareDocs", () => {
  it("finds nothing when the documents match", () => {
    const { doc } = setup();
    const c = compareDocs(DesignDoc.fromState(doc.encodeState()), doc);
    expect(hasChanges(c)).toBe(false);
  });

  it("lists added, removed and changed layers, with the properties that differ", () => {
    const { doc, frame, rect, text, page } = setup();
    const before = DesignDoc.fromState(doc.encodeState());
    doc.setStyle(rect, { fills: [{ type: "SOLID", color: "#000000", opacity: 1 }] });
    doc.resizeNode(frame, { width: 240 });
    doc.deleteNode(text);
    const added = doc.createNode("ELLIPSE", { parentId: page, props: { name: "Dot" } });
    const c = compareDocs(before, doc);
    expect(c.added).toEqual([{ id: added, name: "Dot" }]);
    expect(c.removed).toEqual([{ id: text, name: "Title" }]);
    expect(c.changed.find((x) => x.id === rect)?.fields).toEqual(["fills"]);
    expect(c.changed.find((x) => x.id === frame)?.fields).toContain("width");
    expect(hasChanges(c)).toBe(true);
  });

  it("ignores the stacking key and reports a layer that moved to another parent", () => {
    const { doc, rect, page } = setup();
    const before = DesignDoc.fromState(doc.encodeState());
    doc.reparentNode(rect, page);
    const c = compareDocs(before, doc);
    expect(c.changed.find((x) => x.id === rect)?.fields).toContain("parentId");
    expect(c.changed.find((x) => x.id === rect)?.fields).not.toContain("orderKey");
  });
});
