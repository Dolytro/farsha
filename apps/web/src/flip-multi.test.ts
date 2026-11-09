import { describe, expect, it } from "vitest";
import { mirrorAboutSelection } from "./flip-multi";

describe("mirrorAboutSelection", () => {
  it("mirrors left-right about the middle of the selection", () => {
    const out = mirrorAboutSelection([{ x: 0, y: 0, width: 10, height: 10 }, { x: 30, y: 5, width: 20, height: 10 }], "x");
    expect(out[0]).toMatchObject({ x: 40, y: 0 });
    expect(out[1]).toMatchObject({ x: 0, y: 5 });
  });
  it("mirrors top-bottom", () => {
    const out = mirrorAboutSelection([{ x: 0, y: 0, width: 10, height: 10 }, { x: 0, y: 40, width: 10, height: 10 }], "y");
    expect(out.map((o) => o.y)).toEqual([40, 0]);
  });
  it("leaves a single layer where it is", () => {
    expect(mirrorAboutSelection([{ x: 7, y: 9, width: 4, height: 6 }], "x")[0]).toMatchObject({ x: 7, y: 9 });
  });
  it("turns rotated layers the other way", () => {
    const o = mirrorAboutSelection([{ x: 0, y: 0, width: 10, height: 10, rotation: 30 }, { x: 20, y: 0, width: 10, height: 10 }], "x");
    expect(o[0]!.rotation).toBe(-30);
    expect(mirrorAboutSelection([{ x: 0, y: 0, width: 10, height: 10, rotation: 30 }], "y")[0]!.rotation).toBe(150);
  });
});
