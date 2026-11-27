import { describe, expect, it } from "vitest";
import { spacingBands, spacingDrag } from "./spacing-overlay";

const box = { x: 0, y: 0, width: 200, height: 100 };

describe("spacingBands", () => {
  it("returns nothing without auto layout", () => {
    expect(spacingBands({}, box, [])).toEqual([]);
  });
  it("makes a band per non-zero padding side", () => {
    const b = spacingBands({ layoutMode: "HORIZONTAL", paddingTop: 10, paddingLeft: 20 }, box, []);
    expect(b.map((x) => [x.value, x.width, x.height])).toEqual([[10, 200, 10], [20, 20, 90]]);
  });
  it("finds horizontal gaps", () => {
    const b = spacingBands({ layoutMode: "HORIZONTAL" }, box, [
      { x: 60, y: 0, width: 40, height: 20 },
      { x: 0, y: 0, width: 50, height: 30 },
    ]);
    expect(b).toEqual([{ kind: "gap", side: "gap", value: 10, x: 50, y: 0, width: 10, height: 30 }]);
  });
  it("finds vertical gaps and skips overlaps", () => {
    const b = spacingBands({ layoutMode: "VERTICAL" }, box, [
      { x: 0, y: 0, width: 50, height: 20 },
      { x: 0, y: 28, width: 80, height: 20 },
      { x: 0, y: 40, width: 80, height: 20 },
    ]);
    expect(b).toHaveLength(1);
    expect(b[0]).toMatchObject({ value: 8, y: 20, height: 8, width: 80 });
  });
});

describe("spacingDrag", () => {
  const start = { top: 10, right: 20, bottom: 10, left: 20, gap: 8 };
  it("changes one padding side or the gap, never below 0", () => {
    expect(spacingDrag("top", start, 5.4)).toEqual({ paddingTop: 15 });
    expect(spacingDrag("left", start, -50)).toEqual({ paddingLeft: 0 });
    expect(spacingDrag("gap", start, 4)).toEqual({ itemSpacing: 12 });
  });
  it("Alt does the opposite side, Alt+Shift all four", () => {
    expect(spacingDrag("top", start, 2, { alt: true })).toEqual({ paddingTop: 12, paddingBottom: 12 });
    expect(Object.keys(spacingDrag("right", start, 2, { alt: true, shift: true }))).toHaveLength(4);
  });
});
