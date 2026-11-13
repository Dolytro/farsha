import { describe, expect, it } from "vitest";
import { shapeMarkup, textFill, textFills, vectorPaintAttrs } from "./appearance";

describe("hidden fills and strokes", () => {
  const rect = (extra: Record<string, unknown>) => ({ id: "r1", type: "RECTANGLE", name: "R", x: 0, y: 0, width: 50, height: 40, rotation: 0, opacity: 1, visible: true, locked: false, parentId: "p", orderKey: "a", cornerRadius: 0, strokeWidth: 2, strokes: [], fills: [], ...extra }) as never;
  const red = { type: "SOLID", color: "#ff0000", opacity: 1 };
  const blue = { type: "SOLID", color: "#0000ff", opacity: 1 };

  it("draws a shown fill and leaves a hidden one out", () => {
    expect(shapeMarkup(rect({ fills: [red] }))).toContain("#ff0000");
    const hidden = shapeMarkup(rect({ fills: [{ ...red, visible: false }] }));
    expect(hidden).not.toContain("#ff0000");
    expect(hidden).toContain('fill="none"');
  });
  it("keeps the other fills when one is hidden", () => {
    const markup = shapeMarkup(rect({ fills: [{ ...red, visible: false }, blue] }));
    expect(markup).toContain("#0000ff");
    expect(markup).not.toContain("#ff0000");
  });
  it("leaves a hidden stroke out", () => {
    expect(shapeMarkup(rect({ strokes: [red] }))).toContain("#ff0000");
    expect(shapeMarkup(rect({ strokes: [{ ...red, visible: false }] }))).not.toContain("#ff0000");
  });
  it("uses the first shown paint for a text fill and a vector", () => {
    const text = { id: "t1", type: "TEXT", name: "T", fills: [{ ...red, visible: false }, blue], strokes: [] } as never;
    expect(textFill(text).fill).toBe("#0000ff");
    expect(textFills(text)).toHaveLength(1);
    const vector = { id: "v1", type: "VECTOR", fills: [{ ...red, visible: false }], strokes: [blue], strokeWidth: 1 } as never;
    expect(vectorPaintAttrs(vector)).toContain('fill="none"');
    expect(vectorPaintAttrs(vector)).toContain("#0000ff");
  });
});
