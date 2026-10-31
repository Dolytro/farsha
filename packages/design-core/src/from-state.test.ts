import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { DesignDoc } from "./design-doc";

describe("DesignDoc.fromState", () => {
  it("round-trips a document through encoded bytes", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const rect = doc.createNode("RECTANGLE", { parentId: page, props: { name: "Card", x: 12, y: 34 } });

    const copy = DesignDoc.fromState(doc.encodeState());

    expect(copy.rootId).toBe(doc.rootId);
    expect(copy.getNode(rect)).toMatchObject({ name: "Card", x: 12, y: 34 });
    expect(copy.children(page).map((n) => n.id)).toEqual([rect]);
  });

  it("rejects bytes that are not a Farsha document", () => {
    const other = new Y.Doc();
    other.getMap("something").set("a", 1);
    expect(() => DesignDoc.fromState(Y.encodeStateAsUpdate(other))).toThrow("Not a Farsha file");
  });
});
