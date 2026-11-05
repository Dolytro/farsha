import { describe, expect, it } from "vitest";
import { DesignDoc } from "@farsha/design-core";
import { layerKind, layerRows, moveLayers } from "./layers-tree";

function setup() {
  const doc = new DesignDoc();
  const page = doc.pages()[0]!.id;
  const frame = doc.createNode("FRAME", { parentId: page, props: { name: "Card", x: 100, y: 100, width: 300, height: 300 } });
  const a = doc.createNode("RECTANGLE", { parentId: page, props: { name: "A", x: 10, y: 10, width: 10, height: 10 } });
  const b = doc.createNode("RECTANGLE", { parentId: page, props: { name: "B", x: 50, y: 50, width: 10, height: 10 } });
  const inner = doc.createNode("RECTANGLE", { parentId: frame, props: { name: "Inner", x: 5, y: 5, width: 10, height: 10 } });
  return { doc, page, frame, a, b, inner };
}
const names = (doc: DesignDoc, id: string) => doc.children(id).map((n) => n.name);

describe("moveLayers", () => {
  it("reorders: dropping A above B puts it at the top of the list", () => {
    const { doc, page, a, b } = setup();
    expect(moveLayers(doc, [a], b, "before")).toEqual([a]);
    expect(names(doc, page)).toEqual(["Card", "B", "A"]);
  });
  it("dropping below puts it lower in z-order", () => {
    const { doc, page, a, b } = setup();
    moveLayers(doc, [b], a, "after");
    expect(names(doc, page)).toEqual(["Card", "B", "A"]);
  });
  it("reparents into a frame and keeps the canvas position", () => {
    const { doc, frame, a } = setup();
    moveLayers(doc, [a], frame, "inside");
    expect(doc.getNode(a)!.parentId).toBe(frame);
    expect(doc.absoluteBox(a)).toMatchObject({ x: 10, y: 10 });
  });
  it("rejects dropping into a non-container or into itself", () => {
    const { doc, a, b, frame } = setup();
    expect(moveLayers(doc, [a], b, "inside")).toEqual([]);
    expect(moveLayers(doc, [frame], frame, "inside")).toEqual([]);
  });
});

describe("layerRows", () => {
  it("lists top layer first and hides collapsed children", () => {
    const { doc, page, frame } = setup();
    const ids = (c: string[]) => layerRows(doc, page, new Set(c)).map((r) => doc.getNode(r.id)!.name);
    expect(ids([])).toEqual(["B", "A", "Card", "Inner"]);
    expect(ids([frame])).toEqual(["B", "A", "Card"]);
  });
  it("search keeps matches and their ancestors", () => {
    const { doc, page } = setup();
    expect(layerRows(doc, page, new Set(), "inner").map((r) => doc.getNode(r.id)!.name)).toEqual(["Card", "Inner"]);
  });
  it("a type filter keeps layers of that type and the layers above them, even when collapsed", () => {
    const { doc, page, frame } = setup();
    const names = (kind: Parameters<typeof layerRows>[4]) => layerRows(doc, page, new Set([frame]), "", kind).map((r) => doc.getNode(r.id)!.name);
    expect(names("rectangle")).toEqual(["B", "A", "Card", "Inner"]);
    expect(names("frame")).toEqual(["Card"]);
    expect(names("text")).toEqual([]);
    expect(names("all")).toEqual(["B", "A", "Card"]);
  });
  it("search and type filter must both match", () => {
    const { doc, page } = setup();
    expect(layerRows(doc, page, new Set(), "inner", "rectangle").map((r) => doc.getNode(r.id)!.name)).toEqual(["Card", "Inner"]);
    expect(layerRows(doc, page, new Set(), "inner", "frame")).toEqual([]);
  });
});

describe("layerKind", () => {
  it("tells sections, components and instances apart from frames", () => {
    const { doc, page, frame } = setup();
    const section = doc.createNode("FRAME", { parentId: page, props: { name: "S", isSection: true } });
    const main = doc.createNode("FRAME", { parentId: page, props: { name: "Btn", isComponent: true } });
    const inst = doc.createNode("FRAME", { parentId: page, props: { name: "Btn copy", componentId: main } });
    expect([frame, section, main, inst].map((id) => layerKind(doc, id))).toEqual(["frame", "section", "component", "instance"]);
    expect(layerKind(doc, page)).toBeUndefined();
  });
});
