import { describe, expect, it } from "vitest";
import { DesignDoc } from "@farsha/design-core";
import { searchTargets, JUMP_MAX_LAYERS } from "./palette-search";

function setup() {
  const doc = new DesignDoc();
  const page = doc.pages()[0]!.id;
  const frame = doc.createNode("FRAME", { parentId: page, props: { name: "Login screen" } });
  const button = doc.createNode("RECTANGLE", { parentId: frame, props: { name: "Login button" } });
  return { doc, page, frame, button };
}

describe("searchTargets", () => {
  it("finds layers by name, any case, with the page they are on", () => {
    const { doc, page, frame, button } = setup();
    const found = searchTargets(doc, "LOGIN");
    expect(found.map((t) => t.id)).toEqual([frame, button]);
    expect(found[0]).toMatchObject({ kind: "layer", pageId: page });
  });

  it("finds pages and lists them before layers", () => {
    const { doc, frame } = setup();
    doc.createNode("PAGE", { parentId: doc.rootId, props: { name: "Login flows" } });
    const found = searchTargets(doc, "login");
    expect(found[0]!.kind).toBe("page");
    expect(found[0]!.label).toBe("Login flows");
    expect(found.slice(1).map((t) => t.id)).toContain(frame);
  });

  it("finds layers on other pages too", () => {
    const { doc } = setup();
    const second = doc.createNode("PAGE", { parentId: doc.rootId, props: { name: "Second" } });
    const onSecond = doc.createNode("FRAME", { parentId: second, props: { name: "Pricing table" } });
    expect(searchTargets(doc, "pricing")).toMatchObject([{ kind: "layer", id: onSecond, pageId: second }]);
  });

  it("ignores queries shorter than two characters and caps the layer results", () => {
    const { doc, page } = setup();
    for (let i = 0; i < JUMP_MAX_LAYERS + 4; i++) doc.createNode("RECTANGLE", { parentId: page, props: { name: `Card ${i}` } });
    expect(searchTargets(doc, "c")).toEqual([]);
    expect(searchTargets(doc, "card").filter((t) => t.kind === "layer")).toHaveLength(JUMP_MAX_LAYERS);
  });
});
