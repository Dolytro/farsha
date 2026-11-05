import { describe, expect, it } from "vitest";
import { DesignDoc } from "@farsha/design-core";
import { addPage, adjacentPage, deletePage, duplicatePage, nextCopyPageName, nextPageName } from "./pages";

describe("pages", () => {
  it("adds pages with unique names", () => {
    const doc = new DesignDoc();
    expect(nextPageName(doc)).toBe("Page 2");
    const b = addPage(doc);
    expect(doc.getNode(b)!.name).toBe("Page 2");
    doc.rename(b, "Page 3");
    expect(nextPageName(doc)).toBe("Page 4");
  });
  it("deletes a page and refuses to delete the last one", () => {
    const doc = new DesignDoc();
    const first = doc.pages()[0]!.id;
    expect(deletePage(doc, first)).toBeNull();
    const b = addPage(doc);
    expect(deletePage(doc, b)).toBe(first);
    expect(doc.pages()).toHaveLength(1);
  });
  it("moves between pages and stops at the ends", () => {
    const doc = new DesignDoc();
    const first = doc.pages()[0]!.id;
    const b = addPage(doc);
    expect(adjacentPage(doc, first, 1)).toBe(b);
    expect(adjacentPage(doc, b, 1)).toBe(b);
    expect(adjacentPage(doc, first, -1)).toBe(first);
  });
});

describe("duplicatePage", () => {
  function withLayers() {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const frame = doc.createNode("FRAME", { parentId: page, props: { name: "Card", x: 10, y: 20, width: 100, height: 80 } });
    doc.createNode("RECTANGLE", { parentId: frame, props: { name: "Inner", x: 5, y: 5, width: 20, height: 20 } });
    doc.createNode("TEXT", { parentId: page, props: { name: "Title", characters: "Hello" } });
    return { doc, page, frame };
  }
  it("copies every layer with its children onto a new page right after the original", () => {
    const { doc, page } = withLayers();
    const second = addPage(doc);
    const copy = duplicatePage(doc, page)!;
    expect(doc.pages().map((p) => p.id)).toEqual([page, copy, second]);
    expect(doc.getNode(copy)!.name).toBe("Page 1 copy");
    expect(doc.children(copy).map((n) => n.name)).toEqual(["Card", "Title"]);
    const card = doc.children(copy)[0]!;
    expect(doc.children(card.id).map((n) => n.name)).toEqual(["Inner"]);
    expect({ x: card.x, y: card.y, width: card.width }).toEqual({ x: 10, y: 20, width: 100 });
  });
  it("makes an independent copy and keeps the page background", () => {
    const { doc, page } = withLayers();
    doc.setPageBackground(page, "#123456");
    const copy = duplicatePage(doc, page)!;
    expect(doc.pageBackground(copy)).toBe("#123456");
    const original = doc.children(page)[0]!;
    doc.rename(original.id, "Changed");
    expect(doc.children(copy)[0]!.name).toBe("Card");
    expect(doc.children(copy)[0]!.id).not.toBe(original.id);
  });
  it("refuses something that is not a page", () => {
    const { doc, frame } = withLayers();
    expect(duplicatePage(doc, frame)).toBeNull();
    expect(duplicatePage(doc, "missing")).toBeNull();
  });
  it("names repeated copies uniquely", () => {
    const { doc, page } = withLayers();
    duplicatePage(doc, page);
    expect(nextCopyPageName(doc, "Page 1")).toBe("Page 1 copy 2");
  });
});
