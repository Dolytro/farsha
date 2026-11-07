import { describe, expect, it } from "vitest";
import { DesignDoc } from "@farsha/design-core";
import { conditionTarget, followInteraction, hotspotsIn, mediaState, prototypeFrames, startFrame, topFrameOf } from "./prototype";

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

describe("mediaState", () => {
  const playing = { paused: false, muted: true, time: 5, duration: 20 };
  it("plays, pauses and toggles", () => {
    expect(mediaState("PAUSE", playing).paused).toBe(true);
    expect(mediaState("PLAY", { ...playing, paused: true }).paused).toBe(false);
    expect(mediaState("TOGGLE_PLAY", playing).paused).toBe(true);
    expect(mediaState("TOGGLE_PLAY", { ...playing, paused: true }).paused).toBe(false);
  });
  it("mutes and unmutes", () => {
    expect(mediaState("UNMUTE", playing).muted).toBe(false);
    expect(mediaState("MUTE", { ...playing, muted: false }).muted).toBe(true);
    expect(mediaState("TOGGLE_MUTE", playing).muted).toBe(false);
  });
  it("skips by 10 seconds or the given amount, staying inside the video", () => {
    expect(mediaState("SKIP_FORWARD", playing).time).toBe(15);
    expect(mediaState("SKIP_FORWARD", playing, 30).time).toBe(20);
    expect(mediaState("SKIP_BACK", playing).time).toBe(0);
    expect(mediaState("SKIP_BACK", { ...playing, time: 18 }, 3).time).toBe(15);
    expect(mediaState("SKIP_FORWARD", { ...playing, duration: NaN }, 4).time).toBe(9);
    expect(mediaState("SKIP_FORWARD", playing, -5).time).toBe(15);
  });
  it("leaves the rest of the state alone", () => {
    expect(mediaState("SKIP_FORWARD", playing)).toMatchObject({ paused: false, muted: true });
  });
});

describe("conditionTarget with several conditions", () => {
  function vars() {
    const doc = new DesignDoc();
    const n = doc.createValueVariable("NUMBER", "score", "10");
    const flag = doc.createValueVariable("BOOLEAN", "pro", "true");
    return { doc, n, flag };
  }
  it("needs every condition by default and any one with OR", () => {
    const { doc, n, flag } = vars();
    const base = { type: "CONDITIONAL" as const, variableId: n, op: "GT" as const, value: "5", thenId: "yes", elseId: "no" };
    expect(conditionTarget(doc, base)).toBe("yes");
    const both = { ...base, more: [{ variableId: flag, op: "EQ" as const, value: "true" }] };
    expect(conditionTarget(doc, both)).toBe("yes");
    const failing = { ...base, more: [{ variableId: flag, op: "EQ" as const, value: "false" }] };
    expect(conditionTarget(doc, failing)).toBe("no");
    expect(conditionTarget(doc, { ...failing, join: "OR" })).toBe("yes");
    expect(conditionTarget(doc, { ...failing, value: "50", join: "OR" })).toBe("no");
  });
  it("a missing variable never holds, and extra conditions are capped at five", () => {
    const { doc, n } = vars();
    const base = { type: "CONDITIONAL" as const, variableId: "gone", op: "EQ" as const, value: "x", thenId: "yes", elseId: "no" };
    expect(conditionTarget(doc, base)).toBe("no");
    expect(conditionTarget(doc, { ...base, join: "OR", more: [{ variableId: n, op: "EQ", value: "10" }] })).toBe("yes");
    const many = { type: "CONDITIONAL" as const, variableId: n, op: "EQ" as const, value: "10", thenId: "yes", elseId: "no", join: "OR" as const, more: [...Array(5).fill({ variableId: n, op: "EQ", value: "0" }), { variableId: n, op: "EQ", value: "10" }] };
    expect(conditionTarget(doc, { ...many, join: "OR", variableId: "gone" })).toBe("no");
  });
});
