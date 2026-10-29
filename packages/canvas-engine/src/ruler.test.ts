import { describe, expect, it } from "vitest";
import { rulerStep, rulerTicks } from "./ruler";

describe("rulerStep", () => {
  it("picks 1, 2, 5 times a power of ten so labels stay about 70px apart", () => {
    expect(rulerStep(1)).toBe(100); // 70px target -> 100
    expect(rulerStep(0.5)).toBe(200);
    expect(rulerStep(2)).toBe(50);
    expect(rulerStep(10)).toBe(10);
    expect(rulerStep(0.05)).toBe(2000);
  });
});

describe("rulerTicks", () => {
  it("marks major ticks at multiples of the step and fills in short ones", () => {
    const t = rulerTicks(0, 200, 1); // step 100, minor 20 (20px apart)
    expect(t.filter((x) => x.major).map((x) => x.value)).toEqual([0, 100, 200]);
    expect(t.length).toBe(11);
  });

  it("covers a range that starts mid-step and omits short ticks when zoomed far out", () => {
    const t = rulerTicks(-130, 130, 0.1); // step 1000, minor 200 * 0.1 = 20px
    expect(t.some((x) => x.value === 0 && x.major)).toBe(true);
    expect(t[0]!.value).toBeLessThanOrEqual(-130);
    const far = rulerTicks(0, 5000, 0.01); // step 10000 -> minor 2000 * 0.01 = 20
    expect(far.every((x) => Number.isFinite(x.value))).toBe(true);
  });
});
