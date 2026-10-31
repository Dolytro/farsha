import type { DesignDoc } from "@farsha/design-core";
import type { DesignNode } from "@farsha/types";
import { penPathData, scalePoints } from "./pen";

/**
 * Path data (in the text layer's own coordinates) of the pen path a text layer follows, or null when it follows nothing usable.
 * The path must be a pen path that sits in the same parent and is not rotated or flipped; the text layer must not be rotated either.
 */
export function textPathData(doc: DesignDoc, text: DesignNode): string | null {
  if (text.type !== "TEXT" || !text.textPathId) return null;
  const v = doc.getNode(text.textPathId);
  if (v?.type !== "VECTOR" || !v.penPoints || v.penPoints.length < 2 || v.parentId !== text.parentId) return null;
  if (v.rotation || v.flipX || v.flipY || text.rotation) return null;
  const [, , vw, vh] = v.viewBox.split(/\s+/).map(Number);
  const sx = vw ? v.width / vw : 1;
  const sy = vh ? v.height / vh : 1;
  const points = scalePoints(v.penPoints, sx, sy);
  // the path is drawn relative to the text layer: move it by the difference of the two positions
  return penPathData(points, !!v.penClosed, text.x - v.x, text.y - v.y);
}
