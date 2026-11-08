export interface FlipBox {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}

/**
 * Where several layers of one parent go when they are flipped together: each centre is mirrored about the centre of the
 * box round all of them, and a turned layer turns the other way. (Each layer's own picture is flipped separately.)
 */
export function mirrorAboutSelection(boxes: FlipBox[], axis: "x" | "y"): { x: number; y: number; rotation: number }[] {
  if (!boxes.length) return [];
  const left = Math.min(...boxes.map((b) => b.x));
  const top = Math.min(...boxes.map((b) => b.y));
  const right = Math.max(...boxes.map((b) => b.x + b.width));
  const bottom = Math.max(...boxes.map((b) => b.y + b.height));
  const cx = (left + right) / 2;
  const cy = (top + bottom) / 2;
  return boxes.map((b) => {
    const mx = b.x + b.width / 2;
    const my = b.y + b.height / 2;
    const nx = axis === "x" ? 2 * cx - mx : mx;
    const ny = axis === "y" ? 2 * cy - my : my;
    const turned = b.rotation ?? 0;
    // flipping across a vertical line turns a layer by -r; across a horizontal line by 180 - r (the picture is flipped separately)
    const rotation = turned === 0 ? 0 : axis === "x" ? -turned : 180 - turned;
    return { x: round(nx - b.width / 2), y: round(ny - b.height / 2), rotation: normalise(rotation) };
  });
}

const round = (n: number) => Math.round(n * 100) / 100;
const normalise = (deg: number) => {
  const d = ((deg % 360) + 360) % 360;
  return round(d > 180 ? d - 360 : d);
};
