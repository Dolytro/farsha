import { describe, expect, it } from "vitest";
import { scrubbedValue } from "./field-scrub";

describe("scrubbedValue", () => {
  it("changes by one step per pixel", () => {
    expect(scrubbedValue(100, 12)).toBe(112);
    expect(scrubbedValue(100, -30)).toBe(70);
  });
  it("is ten times faster with Shift and ten times finer with Alt", () => {
    expect(scrubbedValue(0, 5, { shift: true })).toBe(50);
    expect(scrubbedValue(0, 5, { alt: true })).toBe(0.5);
  });
  it("uses the field's step", () => {
    expect(scrubbedValue(1, 3, { step: 0.1 })).toBe(1.3);
  });
  it("stays between min and max", () => {
    expect(scrubbedValue(10, -50, { min: 0 })).toBe(0);
    expect(scrubbedValue(90, 50, { max: 100 })).toBe(100);
  });
  it("rounds to two decimals", () => {
    expect(scrubbedValue(0, 1, { step: 1 / 3 })).toBe(0.33);
  });
});
