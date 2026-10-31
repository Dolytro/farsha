import { describe, expect, it } from "vitest";
import { pencilToPenPoints, simplifyStroke } from "./pencil";

describe("simplifyStroke", () => {
  it("removes points on a straight line and keeps corners", () => {
    const line = Array.from({ length: 20 }, (_, i) => ({ x: i, y: 0 }));
    expect(simplifyStroke(line, 0.5)).toEqual([{ x: 0, y: 0 }, { x: 19, y: 0 }]);
    const elbow = [...line, ...Array.from({ length: 10 }, (_, i) => ({ x: 19, y: i + 1 }))];
    expect(simplifyStroke(elbow, 0.5)).toEqual([{ x: 0, y: 0 }, { x: 19, y: 0 }, { x: 19, y: 10 }]);
  });
  it("keeps short inputs as they are", () => {
    expect(simplifyStroke([{ x: 1, y: 1 }], 1)).toEqual([{ x: 1, y: 1 }]);
  });
});

describe("pencilToPenPoints", () => {
  it("makes the ends sharp and the middle smooth", () => {
    const arc = Array.from({ length: 30 }, (_, i) => ({ x: i * 4, y: Math.sin(i / 5) * 40 }));
    const { points, closed } = pencilToPenPoints(arc, 1);
    expect(closed).toBe(false);
    expect(points[0]).toMatchObject({ hx: 0, hy: 0 });
    expect(points[points.length - 1]).toMatchObject({ hx: 0, hy: 0 });
    expect(points.slice(1, -1).some((p) => p.hx !== 0 || p.hy !== 0)).toBe(true);
    expect(points.length).toBeLessThan(arc.length);
  });
  it("closes a loop that ends near its start", () => {
    const circle = Array.from({ length: 41 }, (_, i) => ({ x: 50 + Math.cos((i / 40) * Math.PI * 2) * 50, y: 50 + Math.sin((i / 40) * Math.PI * 2) * 50 }));
    const { points, closed } = pencilToPenPoints(circle, 1, 6);
    expect(closed).toBe(true);
    expect(points.every((p) => p.hx !== 0 || p.hy !== 0)).toBe(true);
  });
  it("ignores repeated points", () => {
    const { points } = pencilToPenPoints([{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 }], 1);
    expect(points).toHaveLength(2);
  });
});
