import { describe, expect, it } from "vitest";
import { DesignDoc } from "@farsha/design-core";
import { isOldStarter, newWelcomeDoc } from "./welcome";

function legacyDoc(): DesignDoc {
  const doc = new DesignDoc();
  const page = doc.pages()[0]!.id;
  doc.createNode("FRAME", { parentId: page, props: { name: "Welcome to Farsha", x: 0, y: 0, width: 100, height: 100 } });
  doc.createNode("FRAME", { parentId: page, props: { name: "Shortcuts", x: 200, y: 0, width: 100, height: 100 } });
  return doc;
}

describe("starter board", () => {
  it("has the hero card, mobile card and avatars, and counts as an old starter once the real file exists", () => {
    const doc = newWelcomeDoc();
    const names = doc.children(doc.pages()[0]!.id).map((n) => n.name);
    expect(names).toEqual(expect.arrayContaining(["Hero card", "Mobile card", "Avatars"]));
    expect(isOldStarter(doc)).toBe(true);
  });

  it("recognises the untouched old welcome canvas", () => {
    expect(isOldStarter(legacyDoc())).toBe(true);
  });

  it("keeps a canvas the user changed", () => {
    const doc = legacyDoc();
    doc.createNode("RECTANGLE", { parentId: doc.pages()[0]!.id, props: { name: "Mine", x: 0, y: 0, width: 10, height: 10 } });
    expect(isOldStarter(doc)).toBe(false);
  });

  it("recognises an unedited earlier starter file by its boards and layer count", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const names = ["Editor", "Farsha: app, landing and logo", "Files home", "Landing page", "Loader: butterfly", "Logo"];
    const first = doc.createNode("FRAME", { parentId: page, props: { name: names[0]!, x: 0, y: 0, width: 100, height: 100 } });
    names.slice(1).forEach((n, i) => doc.createNode("FRAME", { parentId: page, props: { name: n, x: (i + 1) * 200, y: 0, width: 100, height: 100 } }));
    for (let i = 0; i < 1563 - names.length; i++) doc.createNode("RECTANGLE", { parentId: first, props: { name: "r", x: 0, y: 0, width: 1, height: 1 } });
    expect(isOldStarter(doc)).toBe(true);
    doc.createNode("RECTANGLE", { parentId: first, props: { name: "mine", x: 0, y: 0, width: 1, height: 1 } });
    expect(isOldStarter(doc)).toBe(false);
  }, 30000);
});
