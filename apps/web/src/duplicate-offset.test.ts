import { beforeEach, describe, expect, it } from "vitest";
import { DesignDoc } from "@farsha/design-core";
import { afterDuplicate, duplicateOffset, forgetCopyMove, frameCopyOffset, rememberCopyMove } from "./duplicate-offset";

describe("duplicate offset", () => {
  beforeEach(() => forgetCopyMove());
  it("uses the plain offset when nothing was remembered", () => {
    expect(duplicateOffset(["a"])).toEqual({ x: 10, y: 10 });
  });
  it("repeats the move of an Alt+drag copy for the same layers", () => {
    rememberCopyMove(["c1", "c2"], { x: 120, y: 0 });
    expect(duplicateOffset(["c2", "c1"])).toEqual({ x: 120, y: 0 });
    expect(duplicateOffset(["c1"])).toEqual({ x: 10, y: 10 });
  });
  it("keeps repeating for the new copies", () => {
    rememberCopyMove(["c1"], { x: 50, y: 20 });
    afterDuplicate(["c1"], ["c2"], { x: 50, y: 20 });
    expect(duplicateOffset(["c2"])).toEqual({ x: 50, y: 20 });
    expect(duplicateOffset(["c1"])).toEqual({ x: 10, y: 10 });
  });
  it("a zero move forgets", () => {
    rememberCopyMove(["c1"], { x: 50, y: 20 });
    rememberCopyMove(["c1"], { x: 0, y: 0 });
    expect(duplicateOffset(["c1"])).toEqual({ x: 10, y: 10 });
  });
});

describe("frame copies", () => {
  function setup() {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const a = doc.createNode("FRAME", { parentId: page, props: { name: "A", x: 0, y: 0, width: 300, height: 200 } });
    const b = doc.createNode("FRAME", { parentId: page, props: { name: "B", x: 400, y: 50, width: 100, height: 100 } });
    const inner = doc.createNode("FRAME", { parentId: a, props: { name: "Inner", x: 10, y: 10, width: 50, height: 50 } });
    const rect = doc.createNode("RECTANGLE", { parentId: page, props: { name: "R", x: 0, y: 0, width: 20, height: 20 } });
    return { doc, a, b, inner, rect };
  }
  beforeEach(() => forgetCopyMove());
  it("puts the copy of a top-level frame 100 px to its right", () => {
    const { doc, a } = setup();
    expect(frameCopyOffset(doc, [a])).toEqual({ x: 400, y: 0 });
    expect(duplicateOffset([a], 10, doc)).toEqual({ x: 400, y: 0 });
  });
  it("moves several frames together past the box round them", () => {
    const { doc, a, b } = setup();
    expect(frameCopyOffset(doc, [a, b])).toEqual({ x: 600, y: 0 });
  });
  it("keeps the plain offset for nested frames, other shapes and mixed selections", () => {
    const { doc, a, inner, rect } = setup();
    expect(frameCopyOffset(doc, [inner])).toBeNull();
    expect(frameCopyOffset(doc, [rect])).toBeNull();
    expect(frameCopyOffset(doc, [a, rect])).toBeNull();
    expect(duplicateOffset([rect], 10, doc)).toEqual({ x: 10, y: 10 });
  });
  it("lets a remembered Alt+drag move win", () => {
    const { doc, a } = setup();
    rememberCopyMove([a], { x: 50, y: 0 });
    expect(duplicateOffset([a], 10, doc)).toEqual({ x: 50, y: 0 });
  });
});
