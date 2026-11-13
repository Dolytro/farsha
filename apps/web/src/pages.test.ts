import { describe, expect, it } from "vitest";
import { DesignDoc } from "@farsha/design-core";
import { addPage, adjacentPage, deletePage, duplicatePage, movePage, moveSelectionToPage, moveToPage, nextCopyPageName, nextPageName } from "./pages";

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

describe("movePage", () => {
  const names = (doc: DesignDoc) => doc.pages().map((p) => p.name);
  function three() {
    const doc = new DesignDoc();
    const a = doc.pages()[0]!.id;
    const b = addPage(doc);
    const c = addPage(doc);
    return { doc, a, b, c };
  }

  it("moves a page down and up the list", () => {
    const { doc, a, c } = three();
    const first = names(doc);
    expect(movePage(doc, a, 2)).toBe(true);
    expect(names(doc)).toEqual([first[1], first[2], first[0]]);
    expect(movePage(doc, c, 0)).toBe(true); // c was in the middle
    expect(doc.pages()[0]!.id).toBe(c);
  });

  it("returns false when the page is already there, or unknown, and clamps the index", () => {
    const { doc, a, c } = three();
    const before = names(doc);
    expect(movePage(doc, a, 0)).toBe(false);
    expect(movePage(doc, "missing", 1)).toBe(false);
    expect(names(doc)).toEqual(before);
    expect(movePage(doc, a, 99)).toBe(true);
    expect(doc.pages().map((p) => p.id)[2]).toBe(a);
    expect(movePage(doc, c, -5)).toBe(true);
    expect(doc.pages()[0]!.id).toBe(c);
  });

  it("is one undo step", () => {
    const { doc, a } = three();
    const before = doc.pages().map((p) => p.id);
    movePage(doc, a, 2);
    doc.undo();
    expect(doc.pages().map((p) => p.id)).toEqual(before);
  });
});

describe("moveToPage", () => {
  function setup() {
    const doc = new DesignDoc();
    const first = doc.pages()[0]!.id;
    const second = addPage(doc);
    const frame = doc.createNode("FRAME", { parentId: first, props: { name: "Card", x: 100, y: 200, width: 300, height: 300 } });
    const inner = doc.createNode("RECTANGLE", { parentId: frame, props: { name: "Inner", x: 10, y: 20, width: 30, height: 30 } });
    const loose = doc.createNode("RECTANGLE", { parentId: first, props: { name: "Loose", x: 5, y: 6, width: 10, height: 10 } });
    return { doc, first, second, frame, inner, loose };
  }
  it("moves a layer to another page and keeps its place", () => {
    const { doc, first, second, loose } = setup();
    expect(moveToPage(doc, [loose], second)).toEqual([loose]);
    expect(doc.getNode(loose)!.parentId).toBe(second);
    expect(doc.children(first).map((n) => n.name)).toEqual(["Card"]);
    expect(doc.absoluteBox(loose)).toMatchObject({ x: 5, y: 6 });
  });
  it("keeps the canvas position of a layer taken out of a frame", () => {
    const { doc, second, inner } = setup();
    moveToPage(doc, [inner], second);
    expect(doc.getNode(inner)!.parentId).toBe(second);
    expect(doc.absoluteBox(inner)).toMatchObject({ x: 110, y: 220 });
  });
  it("moves a frame with everything inside it, once, even when its child is selected too", () => {
    const { doc, second, frame, inner } = setup();
    expect(moveToPage(doc, [frame, inner], second)).toEqual([frame]);
    expect(doc.children(frame).map((n) => n.id)).toEqual([inner]);
    expect(doc.getNode(inner)!.parentId).toBe(frame);
  });
  it("ignores layers already on that page, pages and a page that does not exist", () => {
    const { doc, first, loose } = setup();
    expect(moveToPage(doc, [loose], first)).toEqual([]);
    expect(moveToPage(doc, [first], first)).toEqual([]);
    expect(moveToPage(doc, [loose], "nope")).toEqual([]);
  });
  it("is one undo step", () => {
    const { doc, first, second, frame, loose } = setup();
    moveToPage(doc, [frame, loose], second);
    doc.undo();
    expect(doc.children(first).map((n) => n.name).sort()).toEqual(["Card", "Loose"]);
  });
});

describe("moveSelectionToPage", () => {
  it("moves to a new page and names it", () => {
    const doc = new DesignDoc();
    const first = doc.pages()[0]!.id;
    const r = doc.createNode("RECTANGLE", { parentId: first, props: { name: "R", x: 1, y: 2, width: 5, height: 5 } });
    expect(moveSelectionToPage(doc, [r], "new")).toBe("Page 2");
    expect(doc.pages()).toHaveLength(2);
    expect(doc.getNode(r)!.parentId).toBe(doc.pages()[1]!.id);
  });
  it("adds no page when nothing can move", () => {
    const doc = new DesignDoc();
    expect(moveSelectionToPage(doc, [], "new")).toBeNull();
    expect(doc.pages()).toHaveLength(1);
  });
});
