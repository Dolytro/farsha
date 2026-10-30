import { describe, expect, it } from "vitest";
import { DesignDoc } from "@canvylo/design-core";
import { findLayers, replaceInText, stepIndex } from "./find";

function setup() {
  const doc = new DesignDoc();
  const page = doc.pages()[0]!.id;
  const frame = doc.createNode("FRAME", { parentId: page, props: { name: "Login screen" } });
  const t1 = doc.createNode("TEXT", { parentId: frame, props: { name: "Title", characters: "Welcome back" } });
  const t2 = doc.createNode("TEXT", { parentId: frame, props: { name: "Body", characters: "Please log in. Welcome!" } });
  const btn = doc.createNode("RECTANGLE", { parentId: frame, props: { name: "Login button" } });
  return { doc, page, frame, t1, t2, btn };
}

describe("findLayers", () => {
  it("matches layer names and text, ignoring case by default", () => {
    const { doc, page, frame, t1, t2, btn } = setup();
    expect(findLayers(doc, page, "login")).toEqual([frame, btn]);
    expect(findLayers(doc, page, "WELCOME")).toEqual([t1, t2]);
  });

  it("can match case and ignores an empty query", () => {
    const { doc, page } = setup();
    expect(findLayers(doc, page, "WELCOME", { matchCase: true })).toEqual([]);
    expect(findLayers(doc, page, "   ")).toEqual([]);
  });

  it("includes hidden and locked layers", () => {
    const { doc, page, t1 } = setup();
    doc.setStyle(t1, { visible: false, locked: true });
    expect(findLayers(doc, page, "back")).toContain(t1);
  });
});

describe("replaceInText", () => {
  it("replaces every occurrence in text layers only", () => {
    const { doc, page, frame, t1, t2, btn } = setup();
    const ids = findLayers(doc, page, "welcome");
    expect(replaceInText(doc, [...ids, frame, btn], "welcome", "Hello")).toBe(2);
    expect((doc.getNode(t1) as unknown as { characters: string }).characters).toBe("Hello back");
    expect((doc.getNode(t2) as unknown as { characters: string }).characters).toBe("Please log in. Hello!");
    expect(doc.getNode(frame)!.name).toBe("Login screen");
  });

  it("treats the query literally and is one undo step", () => {
    const doc = new DesignDoc();
    const t = doc.createNode("TEXT", { parentId: doc.pages()[0]!.id, props: { characters: "a.b (c) a.b" } });
    doc.stopCapturing();
    expect(replaceInText(doc, [t], "a.b", "$&")).toBe(1);
    expect((doc.getNode(t) as unknown as { characters: string }).characters).toBe("$& (c) $&");
    doc.undo();
    expect((doc.getNode(t) as unknown as { characters: string }).characters).toBe("a.b (c) a.b");
  });
});

describe("stepIndex", () => {
  it("walks forwards and backwards with wrap-around", () => {
    expect(stepIndex(-1, 3, 1)).toBe(0);
    expect(stepIndex(-1, 3, -1)).toBe(2);
    expect(stepIndex(2, 3, 1)).toBe(0);
    expect(stepIndex(0, 3, -1)).toBe(2);
    expect(stepIndex(0, 0, 1)).toBe(-1);
  });
});
