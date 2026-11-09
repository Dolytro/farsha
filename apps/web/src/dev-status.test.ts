import { describe, expect, it } from "vitest";
import { DesignDoc } from "@farsha/design-core";
import { addPage } from "./pages";
import { layersWithDevStatus } from "./dev-status";

describe("layersWithDevStatus", () => {
  it("lists marked layers at any depth and skips the rest and other pages", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const a = doc.createNode("FRAME", { parentId: page, props: { name: "Login", devStatus: "READY" } as never });
    const inner = doc.createNode("RECTANGLE", { parentId: a, props: { name: "Button", devStatus: "COMPLETED" } as never });
    doc.createNode("RECTANGLE", { parentId: a, props: { name: "Plain" } });
    const other = addPage(doc);
    doc.createNode("FRAME", { parentId: other, props: { name: "Elsewhere", devStatus: "READY" } as never });
    expect(layersWithDevStatus(doc, page)).toEqual([
      { id: a, name: "Login", status: "READY" },
      { id: inner, name: "Button", status: "COMPLETED" },
    ]);
  });

  it("is empty when nothing is marked", () => {
    const doc = new DesignDoc();
    expect(layersWithDevStatus(doc, doc.pages()[0]!.id)).toEqual([]);
  });
});
