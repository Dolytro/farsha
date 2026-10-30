import { describe, expect, it } from "vitest";
import { DesignDoc } from "@canvylo/design-core";
import { followInteraction, hotspotsIn, prototypeFrames, startFrame, topFrameOf } from "./prototype";

function setup() {
  const doc = new DesignDoc();
  const page = doc.pages()[0]!.id;
  const home = doc.createNode("FRAME", { parentId: page, props: { x: 0, y: 0, width: 300, height: 600 } });
  const detail = doc.createNode("FRAME", { parentId: page, props: { x: 400, y: 0, width: 300, height: 600 } });
  const button = doc.createNode("RECTANGLE", { parentId: home, props: { x: 20, y: 30, width: 100, height: 40 } });
  doc.createNode("RECTANGLE", { parentId: page });
  return { doc, page, home, detail, button };
}

describe("prototype", () => {
  it("lists the top-level frames and finds the frame of a layer", () => {
    const { doc, home, detail, button } = setup();
    expect(prototypeFrames(doc).map((f) => f.id)).toEqual([home, detail]);
    expect(topFrameOf(doc, button)?.id).toBe(home);
    expect(topFrameOf(doc, home)?.id).toBe(home);
  });

  it("starts from the selected layer's frame, else the first frame", () => {
    const { doc, home, detail } = setup();
    expect(startFrame(doc, [detail])).toBe(detail);
    expect(startFrame(doc, [])).toBe(home);
  });

  it("finds hotspots relative to the frame and ignores hidden layers", () => {
    const { doc, home, detail, button } = setup();
    doc.setStyle(button, { interactions: [{ trigger: "ON_CLICK", action: { type: "NAVIGATE", targetId: detail } }] });
    const spots = hotspotsIn(doc, home);
    expect(spots).toHaveLength(1);
    expect(spots[0]).toMatchObject({ id: button, box: { x: 20, y: 30, width: 100, height: 40 } });
    doc.setStyle(button, { visible: false });
    expect(hotspotsIn(doc, home)).toEqual([]);
  });

  it("navigates, remembers where it came from, and goes back", () => {
    const { doc, home, detail } = setup();
    const go = { trigger: "ON_CLICK" as const, action: { type: "NAVIGATE" as const, targetId: detail } };
    const first = followInteraction(doc, home, [], go)!;
    expect(first).toEqual({ frame: detail, history: [home] });
    const back = followInteraction(doc, detail, first.history, { trigger: "ON_CLICK", action: { type: "BACK" } })!;
    expect(back).toEqual({ frame: home, history: [] });
  });

  it("does nothing for a missing target, the same frame, or back with no history", () => {
    const { doc, home, page } = setup();
    expect(followInteraction(doc, home, [], { trigger: "ON_CLICK", action: { type: "NAVIGATE", targetId: "nope" } })).toBeNull();
    expect(followInteraction(doc, home, [], { trigger: "ON_CLICK", action: { type: "NAVIGATE", targetId: home } })).toBeNull();
    expect(followInteraction(doc, home, [], { trigger: "ON_CLICK", action: { type: "BACK" } })).toBeNull();
    expect(followInteraction(doc, home, [], { trigger: "ON_CLICK", action: { type: "NAVIGATE", targetId: page } })).toBeNull();
  });
});
