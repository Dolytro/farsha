import { describe, expect, it } from "vitest";
import { DesignDoc } from "./design-doc";

describe("assets", () => {
  it("stores and returns image bytes", () => {
    const doc = new DesignDoc();
    const id = doc.addAsset("image/png", Uint8Array.from([1, 2, 3, 4]));
    expect(doc.getAsset(id)?.mime).toBe("image/png");
    expect(Array.from(doc.getAsset(id)!.bytes)).toEqual([1, 2, 3, 4]);
    expect(doc.getAsset("missing")).toBeUndefined();
  });

  it("survives saving and reopening the document", () => {
    const doc = new DesignDoc();
    const id = doc.addAsset("image/jpeg", Uint8Array.from([9, 8, 7]));
    const copy = DesignDoc.fromState(doc.encodeState());
    expect(Array.from(copy.getAsset(id)!.bytes)).toEqual([9, 8, 7]);
  });

  it("notifies subscribers so layers redraw when an image arrives", () => {
    const doc = new DesignDoc();
    let calls = 0;
    doc.subscribe(() => calls++);
    const before = doc.getVersion();
    doc.addAsset("image/png", Uint8Array.from([1]));
    expect(calls).toBe(1);
    expect(doc.getVersion()).toBe(before + 1);
  });

  it("is not undone with the layer that uses it", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    doc.clearHistory();
    const assetId = doc.addAsset("image/png", Uint8Array.from([5]));
    const layer = doc.createNode("IMAGE", { parentId: page, props: { assetId } });
    doc.undo();
    expect(doc.hasNode(layer)).toBe(false);
    expect(doc.getAsset(assetId)).toBeDefined();
  });
});
