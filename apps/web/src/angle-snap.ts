/** The vector (dx, dy) turned to the nearest multiple of `step` degrees, keeping its length (Shift while drawing with the Pen). */
export function snapAngle(dx: number, dy: number, step = 45): { dx: number; dy: number } {
  const len = Math.hypot(dx, dy);
  if (len === 0) return { dx: 0, dy: 0 };
  const a = Math.round(Math.atan2(dy, dx) / ((step * Math.PI) / 180)) * ((step * Math.PI) / 180);
  const r = (v: number) => Math.round(v * 1e6) / 1e6;
  return { dx: r(Math.cos(a) * len), dy: r(Math.sin(a) * len) };
}
