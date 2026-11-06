import { describe, expect, it } from "vitest";
import { DesignDoc } from "@farsha/design-core";
import { boxModelOf } from "./box-model";

describe("boxModelOf", () => {
  it("is null when there is no padding or border", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const r = doc.createNode("RECTANGLE", { parentId: page, props: { strokes: [] } });
    expect(boxModelOf(doc.getNode(r)!)).toBeNull();
  });
  it("reads auto layout padding and a uniform stroke as the border", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const f = doc.createNode("FRAME", { parentId: page, props: { width: 100, height: 50, layoutMode: "VERTICAL", paddingTop: 8, paddingRight: 16, paddingBottom: 8, paddingLeft: 16, strokes: [{ type: "SOLID", color: "#000000", opacity: 1 }], strokeWidth: 2 } });
    expect(boxModelOf(doc.getNode(f)!)).toEqual({ width: 100, height: 50, padding: [8, 16, 8, 16], border: [2, 2, 2, 2] });
  });
  it("prefers per-side stroke weights", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const r = doc.createNode("RECTANGLE", { parentId: page, props: { strokes: [{ type: "SOLID", color: "#000000", opacity: 1 }], strokeWidth: 1, strokeSides: [0, 0, 3, 0] } });
    expect(boxModelOf(doc.getNode(r)!)?.border).toEqual([0, 0, 3, 0]);
  });
  it("ignores layers that are not boxes", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const t = doc.createNode("TEXT", { parentId: page });
    expect(boxModelOf(doc.getNode(t)!)).toBeNull();
  });
});
