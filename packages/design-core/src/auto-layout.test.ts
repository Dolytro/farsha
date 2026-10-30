import { describe, expect, it } from 'vitest';
import { computeAutoLayout } from './auto-layout';

const kids = [
  { id: 'a', width: 40, height: 20 },
  { id: 'b', width: 60, height: 30 },
  { id: 'c', width: 20, height: 10 },
];

describe('computeAutoLayout', () => {
  it('is off without a layout mode', () => {
    expect(computeAutoLayout({ width: 100, height: 100 }, kids)).toBeNull();
  });

  it('lays out a row with gap and padding and hugs the frame', () => {
    const r = computeAutoLayout({ layoutMode: 'HORIZONTAL', itemSpacing: 10, paddingLeft: 5, paddingRight: 7, paddingTop: 3, paddingBottom: 4, width: 0, height: 0 }, kids)!;
    expect(r.positions).toEqual({ a: { x: 5, y: 3 }, b: { x: 55, y: 3 }, c: { x: 125, y: 3 } });
    expect(r.width).toBe(5 + 40 + 10 + 60 + 10 + 20 + 7); // 152
    expect(r.height).toBe(3 + 30 + 4);
  });

  it('lays out a column and centres on the counter axis', () => {
    const r = computeAutoLayout({ layoutMode: 'VERTICAL', itemSpacing: 4, counterAxisAlign: 'CENTER', width: 0, height: 0 }, kids)!;
    expect(r.positions.a).toEqual({ x: 10, y: 0 }); // widest is 60, a is 40 wide
    expect(r.positions.b).toEqual({ x: 0, y: 24 });
    expect(r.positions.c).toEqual({ x: 20, y: 58 });
    expect([r.width, r.height]).toEqual([60, 20 + 4 + 30 + 4 + 10]);
  });

  it('keeps a fixed size and aligns on the main axis', () => {
    const base = { layoutMode: 'HORIZONTAL' as const, primarySizing: 'FIXED' as const, counterSizing: 'FIXED' as const, width: 300, height: 100, itemSpacing: 10 };
    expect(computeAutoLayout({ ...base, primaryAxisAlign: 'MAX' }, kids)!.positions.a.x).toBe(300 - (120 + 20)); // content 140
    expect(computeAutoLayout({ ...base, primaryAxisAlign: 'CENTER' }, kids)!.positions.a.x).toBe(80);
    const sb = computeAutoLayout({ ...base, primaryAxisAlign: 'SPACE_BETWEEN' }, kids)!;
    expect([sb.positions.a.x, sb.positions.b.x, sb.positions.c.x]).toEqual([0, 130, 280]); // gap (300-120)/2 = 90
    expect(computeAutoLayout({ ...base, counterAxisAlign: 'MAX' }, kids)!.positions.a.y).toBe(80);
    expect([sb.width, sb.height]).toEqual([300, 100]);
  });

  it('leaves an empty hugging frame at its size', () => {
    const r = computeAutoLayout({ layoutMode: 'VERTICAL', width: 50, height: 60, paddingTop: 9 }, [])!;
    expect([r.width, r.height]).toEqual([50, 60]);
  });
});

describe('fill container', () => {
  const frame = { layoutMode: 'HORIZONTAL' as const, itemSpacing: 10, paddingLeft: 10, paddingRight: 10, paddingTop: 5, paddingBottom: 5, primarySizing: 'FIXED' as const, counterSizing: 'FIXED' as const, width: 300, height: 100 };

  it('shares the free width between the children that fill', () => {
    const r = computeAutoLayout(frame, [
      { id: 'a', width: 60, height: 20 },
      { id: 'b', width: 10, height: 20, fillWidth: true },
      { id: 'c', width: 10, height: 20, fillWidth: true },
    ])!;
    // 300 - 20 padding - 60 fixed - 20 gaps = 200 free, 100 each
    expect(r.sizes).toEqual({ b: { width: 100, height: 20 }, c: { width: 100, height: 20 } });
    expect(r.positions.b).toEqual({ x: 80, y: 5 });
    expect(r.positions.c).toEqual({ x: 190, y: 5 });
  });

  it('stretches across the other axis', () => {
    const r = computeAutoLayout(frame, [{ id: 'a', width: 50, height: 20, fillHeight: true }])!;
    expect(r.sizes.a).toEqual({ width: 50, height: 90 });
  });

  it('is ignored along a hugging axis', () => {
    const r = computeAutoLayout({ ...frame, primarySizing: 'HUG' }, [{ id: 'a', width: 50, height: 20, fillWidth: true }])!;
    expect(r.sizes).toEqual({});
    expect(r.width).toBe(70);
  });
});

describe('wrap', () => {
  const frame = { layoutMode: 'HORIZONTAL' as const, layoutWrap: true, itemSpacing: 10, counterSpacing: 6, paddingLeft: 10, paddingRight: 10, paddingTop: 5, paddingBottom: 5, primarySizing: 'FIXED' as const, counterSizing: 'HUG' as const, width: 100, height: 0 };
  const items = [
    { id: 'a', width: 40, height: 20 },
    { id: 'b', width: 40, height: 30 },
    { id: 'c', width: 40, height: 10 },
  ];

  it('breaks into lines that fit the inner width, with a line gap', () => {
    // inner width 80: a (40) + gap 10 + b (40) = 90 does not fit, so every item gets its own line
    const r = computeAutoLayout(frame, items)!;
    expect(r.positions.a).toEqual({ x: 10, y: 5 });
    expect(r.positions.b).toEqual({ x: 10, y: 31 });
    expect(r.positions.c).toEqual({ x: 10, y: 67 });
  });

  it('puts items that fit on the same line and hugs the cross size', () => {
    const r = computeAutoLayout({ ...frame, width: 120 }, items)!;
    // inner width 100: a + b = 90 fit, c wraps
    expect(r.positions.a).toEqual({ x: 10, y: 5 });
    expect(r.positions.b).toEqual({ x: 60, y: 5 });
    expect(r.positions.c).toEqual({ x: 10, y: 41 });
    // 5 + 30 (tallest of line 1) + 6 + 10 + 5
    expect(r.height).toBe(56);
    expect(r.width).toBe(120);
  });

  it('aligns each line and the items inside it', () => {
    const r = computeAutoLayout({ ...frame, width: 120, primaryAxisAlign: 'MAX', counterAxisAlign: 'CENTER' }, items)!;
    // line 1 content 90 inside 100 -> starts at 10 + 10; a (h 20) is centred in the 30 high line
    expect(r.positions.a).toEqual({ x: 20, y: 10 });
    expect(r.positions.c.x).toBe(10 + 100 - 40);
  });

  it('works vertically', () => {
    const r = computeAutoLayout({ ...frame, layoutMode: 'VERTICAL', width: 0, height: 80, primarySizing: 'FIXED', counterSizing: 'HUG', paddingTop: 5, paddingBottom: 5 }, items)!;
    // inner height 70: a (20) + 10 + b (30) = 60 fit, c (10) needs 80 -> wraps to a new column
    expect(r.positions.a).toEqual({ x: 10, y: 5 });
    expect(r.positions.b).toEqual({ x: 10, y: 35 });
    expect(r.positions.c.y).toBe(5);
    expect(r.positions.c.x).toBeGreaterThan(10);
  });

  it('ignores wrap while the main size hugs', () => {
    const r = computeAutoLayout({ ...frame, primarySizing: 'HUG' }, items)!;
    expect(r.positions.c.y).toBe(5);
    expect(r.width).toBe(10 + 40 * 3 + 20 + 10);
  });
});
