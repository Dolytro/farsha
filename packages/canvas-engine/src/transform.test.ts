import { describe, expect, it } from "vitest";
import { DesignDoc } from "@canvylo/design-core";
import { nodeTransform } from "./transform";

const make = (props: Record<string, unknown>) => {
  const doc = new DesignDoc();
  const id = doc.createNode("RECTANGLE", { parentId: doc.pages()[0]!.id, props: { x: 10, y: 20, width: 100, height: 40, ...props } });
  return doc.getNode(id)!;
};

describe("nodeTransform", () => {
  it("moves the layer", () => expect(nodeTransform(make({}))).toBe("translate(10 20)"));
  it("rotates about the centre", () => expect(nodeTransform(make({ rotation: 30 }))).toBe("translate(10 20) rotate(30 50 20)"));
  it("flips about the centre after rotating", () => {
    expect(nodeTransform(make({ flipX: true }))).toBe("translate(10 20) translate(50 20) scale(-1 1) translate(-50 -20)");
    expect(nodeTransform(make({ flipX: true, flipY: true, rotation: 90 }))).toContain("rotate(90 50 20) translate(50 20) scale(-1 -1)");
  });
});
