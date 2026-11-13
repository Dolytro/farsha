import { describe, expect, it } from "vitest";
import { gradientAxis, gradientLine, stopAt, stopPositionAt, withoutStop } from "./gradient-line";

const box = { x: 100, y: 50, width: 200, height: 100 };

describe("gradientLine", () => {
  it("runs left to right through the middle at 0 degrees", () => {
    expect(gradientLine(box, 0)).toEqual({ x1: 100, y1: 100, x2: 300, y2: 100 });
  });
  it("runs top to bottom at 90 degrees", () => {
    const l = gradientLine(box, 90);
    expect(l.x1).toBeCloseTo(200);
    expect(l.y1).toBeCloseTo(50);
    expect(l.y2).toBeCloseTo(150);
  });
  it("treats a bad angle as 0", () => {
    expect(gradientLine(box, Number.NaN)).toEqual(gradientLine(box, 0));
  });
});

describe("stopPositionAt", () => {
  const line = gradientLine(box, 0);
  it("measures along the line", () => {
    expect(stopPositionAt(line, { x: 100, y: 100 })).toBe(0);
    expect(stopPositionAt(line, { x: 200, y: 300 })).toBe(0.5);
    expect(stopPositionAt(line, { x: 300, y: 0 })).toBe(1);
  });
  it("keeps the result between 0 and 1", () => {
    expect(stopPositionAt(line, { x: -500, y: 100 })).toBe(0);
    expect(stopPositionAt(line, { x: 900, y: 100 })).toBe(1);
  });
  it("is 0 for a line with no length", () => {
    expect(stopPositionAt({ x1: 1, y1: 1, x2: 1, y2: 1 }, { x: 5, y: 5 })).toBe(0);
  });
});

describe("stopAt", () => {
  const stops = [
    { position: 0, color: "#000000", opacity: 1 },
    { position: 1, color: "#ffffff", opacity: 0 },
  ];
  it("mixes the two stops around the point", () => {
    expect(stopAt(stops, 0.5)).toEqual({ color: "#808080", opacity: 0.5 });
    expect(stopAt(stops, 0.25)).toEqual({ color: "#404040", opacity: 0.75 });
  });
  it("takes the nearest stop outside the range", () => {
    expect(stopAt([{ position: 0.3, color: "#ff0000", opacity: 1 }, { position: 0.6, color: "#00ff00", opacity: 1 }], 0.1)?.color).toBe("#ff0000");
    expect(stopAt([{ position: 0.3, color: "#ff0000", opacity: 1 }, { position: 0.6, color: "#00ff00", opacity: 1 }], 0.9)?.color).toBe("#00ff00");
  });
  it("works with unsorted stops and short hex, and has no answer without stops", () => {
    expect(stopAt([{ position: 1, color: "#fff", opacity: 1 }, { position: 0, color: "#000", opacity: 1 }], 0.5)?.color).toBe("#808080");
    expect(stopAt([], 0.5)).toBeNull();
  });
  it("keeps a colour it cannot read from the closer stop", () => {
    expect(stopAt([{ position: 0, color: "red", opacity: 1 }, { position: 1, color: "#00ff00", opacity: 1 }], 0.8)?.color).toBe("#00ff00");
  });
});

describe("gradientAxis", () => {
  it("is the gradient line for a linear gradient", () => {
    expect(gradientAxis({ type: "GRADIENT_LINEAR", angle: 0 }, box)).toEqual(gradientLine(box, 0));
  });
  it("runs from the middle to the right edge for a radial gradient", () => {
    expect(gradientAxis({ type: "GRADIENT_RADIAL", angle: 45 }, box)).toEqual({ x1: 200, y1: 100, x2: 300, y2: 100 });
  });
  it("has no line for angular and diamond gradients", () => {
    expect(gradientAxis({ type: "GRADIENT_ANGULAR", angle: 0 }, box)).toBeNull();
    expect(gradientAxis({ type: "GRADIENT_DIAMOND", angle: 0 }, box)).toBeNull();
  });
});

describe("withoutStop", () => {
  it("drops one stop", () => {
    expect(withoutStop(["a", "b", "c"], 1)).toEqual(["a", "c"]);
  });
  it("keeps two stops and ignores a bad index", () => {
    const two = ["a", "b"];
    expect(withoutStop(two, 0)).toBe(two);
    const three = ["a", "b", "c"];
    expect(withoutStop(three, 5)).toBe(three);
    expect(withoutStop(three, -1)).toBe(three);
  });
});
