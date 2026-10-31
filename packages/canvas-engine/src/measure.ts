import type { Box } from "@farsha/types";

/** A distance line between two boxes, in page coordinates. */
export interface Measurement {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  value: number;
}

const round = (n: number) => Math.round(n * 100) / 100;

const edges = (b: Box) => ({ L: b.x, R: b.x + b.width, T: b.y, B: b.y + b.height });

/**
 * Distances Figma shows when you hold Alt with a selection and hover another layer:
 * inner gaps when one box contains the other, otherwise the gap along each axis.
 */
export function measure(a: Box, b: Box): Measurement[] {
  const A = edges(a);
  const B = edges(b);
  const out: Measurement[] = [];
  const push = (x1: number, y1: number, x2: number, y2: number, value: number) => {
    if (value > 0) out.push({ x1, y1, x2, y2, value: round(value) });
  };

  const aInB = B.L <= A.L && B.R >= A.R && B.T <= A.T && B.B >= A.B;
  const bInA = A.L <= B.L && A.R >= B.R && A.T <= B.T && A.B >= B.B;
  if (aInB || bInA) {
    const [O, I] = aInB ? [B, A] : [A, B];
    const midX = (I.L + I.R) / 2;
    const midY = (I.T + I.B) / 2;
    push(O.L, midY, I.L, midY, I.L - O.L);
    push(I.R, midY, O.R, midY, O.R - I.R);
    push(midX, O.T, midX, I.T, I.T - O.T);
    push(midX, I.B, midX, O.B, O.B - I.B);
    return out;
  }

  const xOverlap = Math.min(A.R, B.R) - Math.max(A.L, B.L);
  const yOverlap = Math.min(A.B, B.B) - Math.max(A.T, B.T);

  if (xOverlap <= 0) {
    const [x1, x2] = A.R <= B.L ? [A.R, B.L] : [B.R, A.L];
    const y = yOverlap > 0 ? (Math.max(A.T, B.T) + Math.min(A.B, B.B)) / 2 : (A.T + A.B) / 2;
    push(x1, y, x2, y, x2 - x1);
  }
  if (yOverlap <= 0) {
    const [y1, y2] = A.B <= B.T ? [A.B, B.T] : [B.B, A.T];
    const x = xOverlap > 0 ? (Math.max(A.L, B.L) + Math.min(A.R, B.R)) / 2 : (A.L + A.R) / 2;
    push(x, y1, x, y2, y2 - y1);
  }
  if (xOverlap > 0 && yOverlap > 0) {
    // Partially overlapping: show how far the near edges are offset.
    const y = (Math.max(A.T, B.T) + Math.min(A.B, B.B)) / 2;
    const x = (Math.max(A.L, B.L) + Math.min(A.R, B.R)) / 2;
    push(Math.min(A.L, B.L), y, Math.max(A.L, B.L), y, Math.abs(A.L - B.L));
    push(Math.min(A.R, B.R), y, Math.max(A.R, B.R), y, Math.abs(A.R - B.R));
    push(x, Math.min(A.T, B.T), x, Math.max(A.T, B.T), Math.abs(A.T - B.T));
    push(x, Math.min(A.B, B.B), x, Math.max(A.B, B.B), Math.abs(A.B - B.B));
  }
  return out;
}

/** Union of boxes, or undefined for none. */
export function unionBox(boxes: Box[]): Box | undefined {
  if (!boxes.length) return undefined;
  const x1 = Math.min(...boxes.map((b) => b.x));
  const y1 = Math.min(...boxes.map((b) => b.y));
  const x2 = Math.max(...boxes.map((b) => b.x + b.width));
  const y2 = Math.max(...boxes.map((b) => b.y + b.height));
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}
