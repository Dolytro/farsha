import { describe, expect, it } from "vitest";
import { DesignDoc } from "@farsha/design-core";
import { followInteraction, hotspotsIn, interactionsIn, overlayTarget, safeUrl, startFrame, timedAndKeyIn, transitionAnimation } from "./prototype";

function setup() {
  const doc = new DesignDoc();
  const page = doc.pages()[0]!.id;
  const home = doc.createNode("FRAME", { parentId: page, props: { x: 0, y: 0, width: 300, height: 600 } });
  const detail = doc.createNode("FRAME", { parentId: page, props: { x: 400, y: 0, width: 300, height: 600 } });
  const button = doc.createNode("RECTANGLE", { parentId: home, props: { x: 20, y: 30, width: 100, height: 40 } });
  return { doc, home, detail, button };
}

describe("prototype triggers", () => {
  it("lists hover and click spots together, and delay / key interactions separately", () => {
    const { doc, home, detail, button } = setup();
    const go = { type: "NAVIGATE" as const, targetId: detail };
    doc.setStyle(button, {
      interactions: [
        { trigger: "ON_CLICK", action: go },
        { trigger: "ON_HOVER", action: go },
        { trigger: "AFTER_DELAY", delayMs: 500, action: go },
        { trigger: "ON_KEY", key: "Enter", action: go },
      ],
    });
    expect(hotspotsIn(doc, home).map((h) => h.interaction.trigger)).toEqual(["ON_CLICK", "ON_HOVER"]);
    expect(timedAndKeyIn(doc, home).map((h) => h.interaction.trigger)).toEqual(["AFTER_DELAY", "ON_KEY"]);
    expect(interactionsIn(doc, home, ["ON_KEY"])[0]).toMatchObject({ id: button, interaction: { key: "Enter" } });
  });

  it("only opens web addresses", () => {
    expect(safeUrl("https://example.com/a")).toBe("https://example.com/a");
    expect(safeUrl(" http://example.com ")).toBe("http://example.com/");
    expect(safeUrl("javascript:alert(1)")).toBeNull();
    expect(safeUrl("data:text/html,hi")).toBeNull();
    expect(safeUrl("not a url")).toBeNull();
  });

  it("an Open link action never changes frame, and transitions have clamped timings", () => {
    const { doc, home } = setup();
    expect(followInteraction(doc, home, [], { trigger: "ON_CLICK", action: { type: "OPEN_URL", url: "https://x.dev" } })).toBeNull();
    expect(transitionAnimation(undefined)).toBeNull();
    expect(transitionAnimation({ type: "INSTANT", durationMs: 300 })).toBeNull();
    expect(transitionAnimation({ type: "DISSOLVE", durationMs: 99999 })).toEqual({ name: "presenter-dissolve", durationMs: 5000, timing: "ease" });
    expect(transitionAnimation({ type: "SLIDE_IN_LEFT", durationMs: 1 })).toEqual({ name: "presenter-slide-left", durationMs: 50, timing: "ease" });
  });
});

describe("flow starting point", () => {
  it("is where Present starts when nothing is selected, but the selected frame wins", () => {
    const { doc, home, detail } = setup();
    expect(startFrame(doc, [])).toBe(home);
    doc.setStyle(detail, { flowStart: true });
    expect(startFrame(doc, [])).toBe(detail);
    expect(startFrame(doc, [home])).toBe(home);
    doc.setStyle(detail, { flowStart: null });
    expect(startFrame(doc, [])).toBe(home);
  });
});

describe("overlays", () => {
  it("an open overlay interaction shows another frame without navigating", () => {
    const { doc, home, detail } = setup();
    const open = { trigger: "ON_CLICK" as const, action: { type: "OPEN_OVERLAY" as const, targetId: detail } };
    expect(overlayTarget(doc, home, open)).toBe(detail);
    expect(followInteraction(doc, home, [], open)).toBeNull();
    expect(overlayTarget(doc, detail, open)).toBeNull();
    expect(overlayTarget(doc, home, { trigger: "ON_CLICK", action: { type: "OPEN_OVERLAY", targetId: "gone" } })).toBeNull();
    expect(overlayTarget(doc, home, { trigger: "ON_CLICK", action: { type: "NAVIGATE", targetId: detail } })).toBeNull();
  });
  it("close overlay does nothing on its own", () => {
    const { doc, home } = setup();
    expect(followInteraction(doc, home, [], { trigger: "ON_CLICK", action: { type: "CLOSE_OVERLAY" } })).toBeNull();
  });
});

describe("text links", () => {
  it("a linked text layer opens its address on click", () => {
    const { doc, home } = setup();
    const t = doc.createNode("TEXT", { parentId: home, props: { x: 10, y: 100, width: 80, height: 20, textLink: "https://example.com" } as never });
    const spot = hotspotsIn(doc, home).find((h) => h.id === t)!;
    expect(spot.interaction).toEqual({ trigger: "ON_CLICK", action: { type: "OPEN_URL", url: "https://example.com" } });
    expect(spot.box).toMatchObject({ x: 10, y: 100, width: 80, height: 20 });
    doc.setText(t, { textLink: null });
    expect(hotspotsIn(doc, home).some((h) => h.id === t)).toBe(false);
  });
});

describe("drag trigger", () => {
  it("is listed with the clickable areas", () => {
    const { doc, home, detail, button } = setup();
    doc.setStyle(button, { interactions: [{ trigger: "ON_DRAG", action: { type: "NAVIGATE", targetId: detail } }] });
    expect(hotspotsIn(doc, home).map((h) => h.interaction.trigger)).toEqual(["ON_DRAG"]);
    expect(timedAndKeyIn(doc, home)).toEqual([]);
  });
});

describe("stage layout", () => {
  it("fits a tall frame in the window, or fits its width and scrolls", async () => {
    const { stageLayout } = await import("./prototype");
    const tall = { width: 400, height: 2000 };
    const fit = stageLayout(tall, { w: 1040, h: 840 }, false);
    expect(fit.scale).toBeCloseTo(0.4);
    expect(fit.stageHeight).toBeCloseTo(800);
    const scroll = stageLayout(tall, { w: 1040, h: 840 }, true);
    expect(scroll.scale).toBe(2.5);
    expect(scroll.stageHeight).toBe(800);
    expect(stageLayout({ width: 400, height: 300 }, { w: 1040, h: 840 }, true).stageHeight).toBe(750);
  });
});

describe("connectors", () => {
  it("draws an arrow from a layer to the frame it navigates to, and skips other actions", async () => {
    const { connectorsIn, connectorPath } = await import("./prototype");
    const { doc, home, detail, button } = setup();
    const page = doc.pages()[0]!.id;
    doc.setStyle(button, { interactions: [{ trigger: "ON_CLICK", action: { type: "NAVIGATE", targetId: detail } }, { trigger: "ON_CLICK", action: { type: "OPEN_URL", url: "https://x.dev" } }] });
    const list = connectorsIn(doc, page);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: button, from: { x: 120, y: 50 }, to: { x: 400, y: 60 } });
    expect(connectorPath(list[0]!)).toMatch(/^M120 50 C/);
    expect(home).toBeTruthy();
  });
  it("ignores hidden layers and missing frames", async () => {
    const { connectorsIn } = await import("./prototype");
    const { doc, detail, button } = setup();
    const page = doc.pages()[0]!.id;
    doc.setStyle(button, { interactions: [{ trigger: "ON_CLICK", action: { type: "NAVIGATE", targetId: "gone" } }] });
    expect(connectorsIn(doc, page)).toEqual([]);
    doc.setStyle(button, { interactions: [{ trigger: "ON_CLICK", action: { type: "NAVIGATE", targetId: detail } }], visible: false });
    expect(connectorsIn(doc, page)).toEqual([]);
  });
});

describe("prototype round 3", () => {
  it("easing curves start at 0, end at 1 and have css forms", async () => {
    const { easingFn, easingCss } = await import("./prototype");
    for (const e of ["LINEAR", "EASE_IN", "EASE_OUT", "EASE_IN_OUT", "SPRING"] as const) {
      expect(easingFn(e)(0)).toBeCloseTo(0, 1);
      expect(easingFn(e)(1)).toBeCloseTo(1, 1);
    }
    expect(easingFn("EASE_IN")(0.5)).toBeLessThan(0.5);
    expect(easingFn("EASE_OUT")(0.5)).toBeGreaterThan(0.5);
    expect(easingCss("LINEAR")).toBe("linear");
    expect(easingCss(undefined)).toBe("ease");
  });

  it("scroll modes size the stage", async () => {
    const { stageLayout } = await import("./prototype");
    const wide = { width: 3000, height: 400 };
    const h = stageLayout(wide, { w: 1040, h: 840 }, "HORIZONTAL");
    expect(h.stageWidth).toBe(1000);
    expect(h.stageHeight).toBe(400 * h.scale);
    const both = stageLayout({ width: 3000, height: 3000 }, { w: 1040, h: 840 }, "BOTH");
    expect(both.scale).toBe(1);
    expect(both.stageWidth).toBe(1000);
    expect(both.stageHeight).toBe(800);
  });
});

describe("flowsOf", () => {
  it("lists the starting frames and names unnamed flows by position", async () => {
    const { flowsOf } = await import("./prototype");
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const a = doc.createNode("FRAME", { parentId: page, props: { name: "A", width: 100, height: 100 } as never });
    const b = doc.createNode("FRAME", { parentId: page, props: { name: "B", width: 100, height: 100 } as never });
    doc.createNode("FRAME", { parentId: page, props: { name: "C", width: 100, height: 100 } as never });
    expect(flowsOf(doc)).toEqual([]);
    doc.setStyle(a, { flowStart: true });
    doc.setStyle(b, { flowStart: true, flowName: " Checkout " });
    expect(flowsOf(doc)).toEqual([{ frameId: a, name: "Flow 1" }, { frameId: b, name: "Checkout" }]);
  });
});

describe("present scale", () => {
  it("fits, fills or shows the frame at 100%", async () => {
    const { stageLayout } = await import("./prototype");
    const f = { width: 400, height: 200 };
    const win = { w: 1040, h: 840 };
    expect(stageLayout(f, win, false, "FIT").scale).toBe(2.5);
    const fill = stageLayout(f, win, false, "FILL");
    expect(fill.scale).toBe(4);
    expect(fill.stageHeight).toBe(800);
    const actual = stageLayout(f, win, false, "ACTUAL");
    expect(actual.scale).toBe(1);
    expect(actual.stageWidth).toBe(400);
  });
});

describe("set variable mode", () => {
  it("does not navigate", () => {
    const { doc, home } = setup();
    const mode = doc.activeModeId();
    expect(followInteraction(doc, home, [], { trigger: "ON_CLICK", action: { type: "SET_MODE", modeId: mode } })).toBeNull();
  });
});

describe("move out and push", () => {
  it("names the animations of the new and the leaving frame", async () => {
    const { transitionAnimation } = await import("./prototype");
    expect(transitionAnimation({ type: "MOVE_OUT_LEFT", durationMs: 400 })).toMatchObject({ name: "presenter-hold", leave: "presenter-out-left", durationMs: 400 });
    expect(transitionAnimation({ type: "PUSH_LEFT", durationMs: 400 })).toMatchObject({ name: "presenter-slide-left", leave: "presenter-out-right" });
    expect(transitionAnimation({ type: "PUSH_TOP", durationMs: 400 })).toMatchObject({ name: "presenter-slide-top", leave: "presenter-out-bottom" });
    expect(transitionAnimation({ type: "SLIDE_IN_LEFT", durationMs: 400 })?.leave).toBeUndefined();
  });
});

describe("conditional", () => {
  it("goes to the then or else frame depending on a variable", () => {
    const { doc, home, detail } = setup();
    const mode = doc.activeModeId();
    const n = doc.createValueVariable("NUMBER", "Count", "3");
    const go = (op: "EQ" | "NEQ" | "GT" | "LT", value: string, elseId?: string) =>
      followInteraction(doc, home, [], { trigger: "ON_CLICK", action: { type: "CONDITIONAL", variableId: n, op, value, thenId: detail, elseId } })?.frame;
    expect(go("EQ", "3")).toBe(detail);
    expect(go("EQ", "4")).toBeUndefined();
    expect(go("EQ", "4", detail)).toBe(detail);
    expect(go("GT", "2")).toBe(detail);
    expect(go("LT", "2")).toBeUndefined();
    expect(go("NEQ", "2")).toBe(detail);
    doc.setVariableValue(n, mode, "1");
    expect(go("LT", "2")).toBe(detail);
    const b = doc.createValueVariable("BOOLEAN", "On", "true");
    expect(followInteraction(doc, home, [], { trigger: "ON_CLICK", action: { type: "CONDITIONAL", variableId: b, op: "EQ", value: "True", thenId: detail } })?.frame).toBe(detail);
  });
  it("Move in comes in from a side and Slide out leaves toward one", () => {
    expect(transitionAnimation({ type: "MOVE_IN_TOP", durationMs: 300 })).toMatchObject({ name: "presenter-slide-top" });
    expect(transitionAnimation({ type: "SLIDE_OUT_RIGHT", durationMs: 300 })).toMatchObject({ name: "presenter-hold", leave: "presenter-out-right" });
  });
});
