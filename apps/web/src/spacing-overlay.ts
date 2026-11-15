/** Dev Mode spacing overlay: the padding bands and the gaps between the children of an auto layout frame. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface SpacingBand extends Rect {
  kind: "padding" | "gap";
  value: number;
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
export function spacingBands(frame: SpacingFrame, box: Rect, children: Rect[]): SpacingBand[] {
  if (!frame.layoutMode) return [];
  const out: SpacingBand[] = [];
  const t = frame.paddingTop ?? 0;
  const r = frame.paddingRight ?? 0;
  const b = frame.paddingBottom ?? 0;
  const l = frame.paddingLeft ?? 0;
  const midH = Math.max(0, box.height - t - b);
  if (t > 0) out.push({ kind: "padding", value: r1(t), x: box.x, y: box.y, width: box.width, height: t });
  if (b > 0) out.push({ kind: "padding", value: r1(b), x: box.x, y: box.y + box.height - b, width: box.width, height: b });
  if (l > 0) out.push({ kind: "padding", value: r1(l), x: box.x, y: box.y + t, width: l, height: midH });
  if (r > 0) out.push({ kind: "padding", value: r1(r), x: box.x + box.width - r, y: box.y + t, width: r, height: midH });
  const horizontal = frame.layoutMode === "HORIZONTAL";
  const sorted = [...children].sort((p, q) => (horizontal ? p.x - q.x : p.y - q.y));
  for (let i = 0; i + 1 < sorted.length; i++) {
    const a = sorted[i]!;
    const n = sorted[i + 1]!;
    if (horizontal) {
      const gap = n.x - (a.x + a.width);
      if (gap <= 0.05) continue;
      const y = Math.min(a.y, n.y);
      out.push({ kind: "gap", value: r1(gap), x: a.x + a.width, y, width: gap, height: Math.max(a.y + a.height, n.y + n.height) - y });
    } else {
      const gap = n.y - (a.y + a.height);
      if (gap <= 0.05) continue;
      const x = Math.min(a.x, n.x);
      out.push({ kind: "gap", value: r1(gap), x, y: a.y + a.height, width: Math.max(a.x + a.width, n.x + n.width) - x, height: gap });
    }
  }
  return out;
}
