import { describe, expect, it } from "vitest";
import { DesignDoc } from "@farsha/design-core";
import { arcParams, ellipsePath, isFullEllipse } from "./ellipse-arc";
import { exportSvg } from "./svg-export";

describe("arcParams", () => {
  it("defaults to a full ellipse and keeps values in range", () => {
    expect(arcParams({})).toEqual({ start: 0, sweep: 360, ratio: 0 });
    expect(arcParams({ arcStart: -90, arcSweep: 500, arcRatio: 2 })).toEqual({ start: -90, sweep: 360, ratio: 0.99 });
    expect(arcParams({ arcSweep: -5, arcRatio: -1 })).toEqual({ start: 0, sweep: 0, ratio: 0 });
    expect(arcParams({ arcStart: "x", arcSweep: NaN })).toEqual({ start: 0, sweep: 360, ratio: 0 });
    expect(isFullEllipse(arcParams({}))).toBe(true);
    expect(isFullEllipse(arcParams({ arcRatio: 0.5 }))).toBe(false);
  });
});

describe("ellipsePath", () => {
  it("is null for a plain ellipse", () => {
    expect(ellipsePath(100, 100, { start: 0, sweep: 360, ratio: 0 })).toBeNull();
  });

  it("makes a pie from the centre", () => {
    const p = ellipsePath(100, 100, { start: 0, sweep: 90, ratio: 0 })!;
    expect(p.evenodd).toBe(false);
    expect(p.d).toBe("M50 50L100 50A50 50 0 0 1 50 100Z");
  });

  it("uses the large arc flag past half a turn", () => {
    expect(ellipsePath(100, 100, { start: 0, sweep: 270, ratio: 0 })!.d).toContain("A50 50 0 1 1");
  });

  it("makes a ring sector with an inner arc going back", () => {
    const p = ellipsePath(100, 100, { start: 0, sweep: 90, ratio: 0.5 })!;
    expect(p.d).toBe("M100 50A50 50 0 0 1 50 100L50 75A25 25 0 0 0 75 50Z");
  });

  it("makes a full ring from two outlines with even-odd fill", () => {
    const p = ellipsePath(100, 100, { start: 0, sweep: 360, ratio: 0.5 })!;
    expect(p.evenodd).toBe(true);
    expect(p.d.match(/M/g)).toHaveLength(2);
    expect(p.d).toContain("A25 25 0 1 1");
  });

  it("follows a non-square box", () => {
    expect(ellipsePath(200, 100, { start: 0, sweep: 90, ratio: 0 })!.d).toBe("M100 50L200 50A100 50 0 0 1 100 100Z");
  });

  it("draws nothing for a zero sweep", () => {
    expect(ellipsePath(100, 100, { start: 0, sweep: 0, ratio: 0 })!.d).toBe("");
  });
});

describe("ellipse arcs in SVG export", () => {
  it("exports a path instead of an ellipse element", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const arc = doc.createNode("ELLIPSE", { parentId: page, props: { width: 100, height: 100, arcSweep: 90, fills: [{ type: "SOLID", color: "#ff0000", opacity: 1 }] } as never });
    const full = doc.createNode("ELLIPSE", { parentId: page, props: { width: 100, height: 100, fills: [{ type: "SOLID", color: "#ff0000", opacity: 1 }] } as never });
    const a = exportSvg(doc, [arc])?.svg ?? "";
    expect(a).toContain('<path d="M50 50L100 50A50 50 0 0 1 50 100Z"');
    expect(a).not.toContain("<ellipse");
    expect(exportSvg(doc, [full])?.svg ?? "").toContain("<ellipse");
  });
});
