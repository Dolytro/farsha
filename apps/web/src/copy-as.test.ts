import { describe, expect, it } from "vitest";
import { DesignDoc } from "@canvylo/design-core";
import { cssOfAll, textOf } from "./copy-as";

function setup() {
  const doc = new DesignDoc();
  const page = doc.pages()[0]!.id;
  const frame = doc.createNode("FRAME", { parentId: page, props: { name: "Card", width: 200, height: 100 } });
  const lower = doc.createNode("TEXT", { parentId: frame, props: { characters: "Second", y: 50 } });
  const upper = doc.createNode("TEXT", { parentId: frame, props: { characters: "First", y: 10 } });
  doc.createNode("RECTANGLE", { parentId: frame, props: { name: "Bg", width: 10, height: 10 } });
  return { doc, frame, lower, upper };
}

describe("copy as text", () => {
  it("lists the words of every text layer in reading order", () => {
    const { doc, frame } = setup();
    expect(textOf(doc, [frame])).toBe("First\nSecond");
  });
  it("is empty when there is no text", () => {
    const doc = new DesignDoc();
    expect(textOf(doc, [doc.createNode("RECTANGLE", { parentId: doc.pages()[0]!.id })])).toBe("");
  });
});

describe("CSS of all layers", () => {
  it("has a rule per layer, once each", () => {
    const { doc, frame, upper } = setup();
    const css = cssOfAll(doc, [frame, upper]);
    expect(css.match(/\{/g)!.length).toBe(4);
    expect(css).toContain(".card");
    expect(css).toContain(".bg");
  });
});
