import { describe, expect, it } from "vitest";
import { rowWindow, scrollToRow } from "./virtual-rows";

describe("rowWindow", () => {
  it("is every row for a short list", () => {
    expect(rowWindow(5, 24, 0, 600)).toEqual({ start: 0, end: 5, before: 0, after: 0 });
  });
  it("draws the rows in view plus an overscan, with spacers above and below", () => {
    const w = rowWindow(1000, 24, 2400, 240, 5); // rows 100 to 110 are in view
    expect(w).toEqual({ start: 95, end: 115, before: 95 * 24, after: 885 * 24 });
    expect(w.before + (w.end - w.start) * 24 + w.after).toBe(1000 * 24);
  });
  it("stays inside the list near both ends, and for odd input", () => {
    expect(rowWindow(1000, 24, 0, 240, 5)).toMatchObject({ start: 0, end: 15 });
    expect(rowWindow(1000, 24, 999 * 24, 240, 5)).toMatchObject({ end: 1000, after: 0 });
    expect(rowWindow(0, 24, 0, 100)).toEqual({ start: 0, end: 0, before: 0, after: 0 });
    expect(rowWindow(50, 0, -10, -5).end).toBeGreaterThan(0);
  });
});

describe("scrollToRow", () => {
  it("leaves the scroll alone when the row is visible, and moves just enough otherwise", () => {
    expect(scrollToRow(5, 24, 0, 240)).toBe(0);
    expect(scrollToRow(20, 24, 0, 240)).toBe(20 * 24 + 24 - 240);
    expect(scrollToRow(2, 24, 240, 240)).toBe(48);
  });
});
