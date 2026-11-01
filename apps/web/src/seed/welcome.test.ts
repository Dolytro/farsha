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
});
