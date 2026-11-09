import { describe, expect, it } from "vitest";
import { DesignDoc } from "@farsha/design-core";
import { createComponentFromSelection } from "./component-actions";

describe("createComponentFromSelection", () => {
  it("turns a frame into a component in place", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const frame = doc.createNode("FRAME", { parentId: page });
    expect(createComponentFromSelection(doc, [frame])).toEqual([frame]);
    expect(doc.getNode(frame)).toMatchObject({ isComponent: true });
  });
  it("makes one component per selected layer", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const a = doc.createNode("RECTANGLE", { parentId: page });
    const b = doc.createNode("ELLIPSE", { parentId: page });
    const f = doc.createNode("FRAME", { parentId: page });
    const made = createComponentFromSelection(doc, [a, b, f]);
    expect(made).toHaveLength(3);
    expect(new Set(made).size).toBe(3);
    for (const id of made) expect(doc.getNode(id)).toMatchObject({ type: "FRAME", isComponent: true });
    expect(made).toContain(f);
  });
});
