/** Distance between labelled ruler ticks, in world units: 1, 2, 5, 10, 20, 50 ... chosen so ticks are at least `minPx` apart on screen. */
export function rulerStep(zoom: number, minPx = 70): number {
  const target = minPx / Math.max(zoom, 1e-6);
  const base = 10 ** Math.floor(Math.log10(target));
  for (const m of [1, 2, 5, 10]) if (base * m >= target) return base * m;
  return base * 10;
}

export interface RulerTick {
  /** World coordinate of the tick. */
  value: number;
  /** Labelled (major) tick, or a short unlabelled one. */
  major: boolean;
}

/** Ticks covering the world range [from, to]; short ticks fill each step in fifths when there is room. */
export function rulerTicks(from: number, to: number, zoom: number): RulerTick[] {
  const step = rulerStep(zoom);
  const minor = step / 5;
  const showMinor = minor >= 1 && minor * zoom >= 7;
  const inc = showMinor ? minor : step;
  const out: RulerTick[] = [];
  const first = Math.floor(from / inc) * inc;
  for (let v = first, i = 0; v <= to && i < 2000; v += inc, i++) {
    out.push({ value: Math.round(v * 1000) / 1000, major: Math.abs(v / step - Math.round(v / step)) < 1e-9 });
  }
  return out;
}
