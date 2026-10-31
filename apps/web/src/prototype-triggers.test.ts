import { describe, expect, it } from "vitest";
import { DesignDoc } from "@canvylo/design-core";
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
    expect(transitionAnimation({ type: "DISSOLVE", durationMs: 99999 })).toEqual({ name: "presenter-dissolve", durationMs: 5000 });
    expect(transitionAnimation({ type: "SLIDE_IN_LEFT", durationMs: 1 })).toEqual({ name: "presenter-slide-left", durationMs: 50 });
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
