import type { Constraint } from "@farsha/types";

export type ConstraintSide = "start" | "end" | "center";

/**
 * What clicking a side of Figma's constraints diagram does on one axis. The start side is left or top, the end side right or bottom.
 * Clicking the other side of a pinned layer pins both (STRETCH); clicking a side of a stretched layer lets go of it;
 * the centre line always means CENTER. A layer is never left with no side at all.
 */
export function toggleConstraint(current: Constraint, side: ConstraintSide): Constraint {
  if (side === "center") return "CENTER";
  if (current === "STRETCH") return side === "start" ? "MAX" : "MIN";
  if (current === "MIN") return side === "end" ? "STRETCH" : "MIN";
  if (current === "MAX") return side === "start" ? "STRETCH" : "MAX";
  return side === "start" ? "MIN" : "MAX"; // CENTER and SCALE: pin to the side that was clicked
}

/** Which of the three lines of an axis are lit for a constraint (SCALE lights none: it is set from the list). */
export function litSides(c: Constraint): Record<ConstraintSide, boolean> {
  return { start: c === "MIN" || c === "STRETCH", end: c === "MAX" || c === "STRETCH", center: c === "CENTER" };
}
