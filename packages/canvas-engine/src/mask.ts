import type { DesignNode } from "@farsha/types";
import { shapeGeometry, shapeMarkup } from "./appearance";
import { nodeTransform } from "./transform";

const safeId = (id: string) => id.replace(/[^A-Za-z0-9_-]/g, "_");

/**
 * The SVG `<mask>` for a mask layer: its shape drawn in white, in the coordinates of its parent.
 * `inner` is the content of the mask element, `defs` the complete element (used by SVG export).
 */
export function maskMarkup(n: DesignNode): { id: string; inner: string; defs: string } {
  const id = `mask-${safeId(n.id)}`;
  let shape: string;
  if (n.type === "VECTOR") {
    const par = Array.isArray(n.fills) ? ' preserveAspectRatio="none"' : "";
    shape = `<svg width="${n.width}" height="${Math.max(n.height, 0.001)}" viewBox="${n.viewBox.replace(/[^0-9eE+\-.\s,]/g, "")}"${par} overflow="visible"><g fill="#fff" stroke="none">${n.markup}</g></svg>`;
  } else if ((n.type === "RECTANGLE" || n.type === "ELLIPSE" || n.type === "FRAME") && n.maskType === "LUMINANCE") {
    // a luminance mask shows the layers above it as much as its own fills are light: light shows, dark hides
    shape = shapeMarkup(n);
  } else if (n.type === "RECTANGLE" || n.type === "ELLIPSE" || n.type === "FRAME") {
    shape = shapeGeometry(n, ' fill="#fff"');
  } else {
    shape = `<rect width="${n.width}" height="${n.height}" fill="#fff"/>`;
  }
  const inner = `<g transform="${nodeTransform(n)}">${shape}</g>`;
  return { id, inner, defs: `<mask id="${id}" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="-1000000" y="-1000000" width="2000000" height="2000000">${inner}</mask>` };
}
