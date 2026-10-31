import { describe, expect, it } from "vitest";
import { DesignDoc } from "@farsha/design-core";
import { addPage, adjacentPage, deletePage, nextPageName } from "./pages";

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
