/** Dev Mode spacing overlay: the padding bands and the gaps between the children of an auto layout frame. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export type SpacingSide = "top" | "right" | "bottom" | "left" | "gap";
export interface SpacingBand extends Rect {
  kind: "padding" | "gap";
  value: number;
  /** Which setting the band is: one padding side, or the gap between the children. */
  side: SpacingSide;
}
export interface SpacingFrame {
  layoutMode?: "HORIZONTAL" | "VERTICAL" | null;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Bands (frame box and children boxes are absolute). Children in layout order; absolute-positioned ones are left out by the caller. */
export function spacingBands(frame: SpacingFrame, box: Rect, children: Rect[], opts: { includeZero?: boolean } = {}): SpacingBand[] {
  if (!frame.layoutMode) return [];
  const out: SpacingBand[] = [];
  const t = frame.paddingTop ?? 0;
  const r = frame.paddingRight ?? 0;
  const b = frame.paddingBottom ?? 0;
  const l = frame.paddingLeft ?? 0;
  const midH = Math.max(0, box.height - t - b);
  const zero = !!opts.includeZero;
  if (t > 0 || zero) out.push({ kind: "padding", side: "top", value: r1(t), x: box.x, y: box.y, width: box.width, height: t });
  if (b > 0 || zero) out.push({ kind: "padding", side: "bottom", value: r1(b), x: box.x, y: box.y + box.height - b, width: box.width, height: b });
  if (l > 0 || zero) out.push({ kind: "padding", side: "left", value: r1(l), x: box.x, y: box.y + t, width: l, height: midH });
  if (r > 0 || zero) out.push({ kind: "padding", side: "right", value: r1(r), x: box.x + box.width - r, y: box.y + t, width: r, height: midH });
  const horizontal = frame.layoutMode === "HORIZONTAL";
  const sorted = [...children].sort((p, q) => (horizontal ? p.x - q.x : p.y - q.y));
  for (let i = 0; i + 1 < sorted.length; i++) {
    const a = sorted[i]!;
    const n = sorted[i + 1]!;
    if (horizontal) {
      const gap = n.x - (a.x + a.width);
      if (gap <= 0.05) continue;
      const y = Math.min(a.y, n.y);
      out.push({ kind: "gap", side: "gap", value: r1(gap), x: a.x + a.width, y, width: gap, height: Math.max(a.y + a.height, n.y + n.height) - y });
    } else {
      const gap = n.y - (a.y + a.height);
      if (gap <= 0.05) continue;
      const x = Math.min(a.x, n.x);
      out.push({ kind: "gap", side: "gap", value: r1(gap), x, y: a.y + a.height, width: Math.max(a.x + a.width, n.x + n.width) - x, height: gap });
    }
  }
  return out;
}

/** The padding or gap settings a drag of one band changes: `delta` is how far the pointer moved along the band's axis, away from the frame's edge for a padding band. Alt does the opposite side too, Shift (with Alt) all four. */
export function spacingDrag(
  side: SpacingSide,
  start: { top: number; right: number; bottom: number; left: number; gap: number },
  delta: number,
  mods: { alt?: boolean; shift?: boolean } = {},
): Partial<{ paddingTop: number; paddingRight: number; paddingBottom: number; paddingLeft: number; itemSpacing: number }> {
  const v = (n: number) => Math.max(0, Math.round(n));
  if (side === "gap") return { itemSpacing: v(start.gap + delta) };
  const opposite = { top: "bottom", bottom: "top", left: "right", right: "left" } as const;
  const sides: ("top" | "right" | "bottom" | "left")[] = mods.alt && mods.shift ? ["top", "right", "bottom", "left"] : mods.alt ? [side, opposite[side]] : [side];
  const key = { top: "paddingTop", right: "paddingRight", bottom: "paddingBottom", left: "paddingLeft" } as const;
  const out: Record<string, number> = {};
  for (const sd of sides) out[key[sd]] = v(start[sd] + delta);
  return out;
}
