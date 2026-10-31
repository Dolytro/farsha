import { describe, expect, it } from "vitest";
import { DesignDoc } from "@farsha/design-core";
import { pageLayerIds } from "./page-export";

describe("pageLayerIds", () => {
  it("lists the visible top-level layers of the page, bottom to top", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const a = doc.createNode("FRAME", { parentId: page });
    const hidden = doc.createNode("RECTANGLE", { parentId: page, props: { visible: false } });
    const b = doc.createNode("ELLIPSE", { parentId: page });
    doc.createNode("RECTANGLE", { parentId: a });
    expect(pageLayerIds(doc, page)).toEqual([a, b]);
    expect(pageLayerIds(doc, page)).not.toContain(hidden);
  });
});
