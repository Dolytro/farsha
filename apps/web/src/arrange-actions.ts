import type { DesignDoc } from "@canvylo/design-core";
import type { DesignNode } from "@canvylo/types";

export type EdgeMode = "left" | "hcenter" | "right" | "top" | "vcenter" | "bottom";

const real = (doc: DesignDoc, ids: string[]): DesignNode[] => {
  const nodes = ids.map((id) => doc.getNode(id)).filter((n): n is DesignNode => !!n && !!n.parentId && n.type !== "PAGE" && n.type !== "DOCUMENT");
  // layers can only be arranged against each other inside one parent
  return nodes.length && nodes.every((n) => n.parentId === nodes[0]!.parentId) ? nodes : [];
};

const round2 = (v: number) => Math.round(v * 100) / 100;

/** Figma's "Distribute left / horizontal centers / right / top / vertical centers / bottom": the chosen edge or centre is spaced evenly between the outermost layers. */
export function distributeEdges(doc: DesignDoc, ids: string[], mode: EdgeMode): number {
  const nodes = real(doc, ids);
  if (nodes.length < 3) return 0;
  const horizontal = mode === "left" || mode === "hcenter" || mode === "right";
  const at = (n: DesignNode) => {
    const size = horizontal ? n.width : n.height;
    const pos = horizontal ? n.x : n.y;
    return mode === "left" || mode === "top" ? pos : mode === "hcenter" || mode === "vcenter" ? pos + size / 2 : pos + size;
  };
  const sorted = [...nodes].sort((a, b) => at(a) - at(b));
  const first = at(sorted[0]!);
  const step = (at(sorted[sorted.length - 1]!) - first) / (sorted.length - 1);
  doc.stopCapturing();
  sorted.forEach((n, i) => {
    const delta = first + step * i - at(n);
    if (Math.abs(delta) < 1e-6) return;
    doc.setPosition(n.id, round2(n.x + (horizontal ? delta : 0)), round2(n.y + (horizontal ? 0 : delta)));
  });
  doc.stopCapturing();
  return sorted.length;
}

/** Group layers into rows: a layer starts a new row when it begins below the middle of the current row. */
function toRows(nodes: DesignNode[]): DesignNode[][] {
  const sorted = [...nodes].sort((a, b) => a.y - b.y || a.x - b.x);
  const rows: DesignNode[][] = [];
  for (const n of sorted) {
    const row = rows[rows.length - 1];
    if (row) {
      const top = Math.min(...row.map((r) => r.y));
      const bottom = Math.max(...row.map((r) => r.y + r.height));
      if (n.y < top + (bottom - top) / 2) {
        row.push(n);
        continue;
      }
    }
    rows.push([n]);
  }
  return rows.map((r) => r.sort((a, b) => a.x - b.x));
}

const average = (values: number[], fallback: number) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : fallback);

/**
 * Figma's "Tidy up": layers are arranged into neat rows and columns with an even gap. Rows are found from the current positions,
 * the horizontal and vertical gaps become the average of the gaps that were there, and everything starts at the selection's corner.
 */
export function tidyUp(doc: DesignDoc, ids: string[]): number {
  const nodes = real(doc, ids);
  if (nodes.length < 2) return 0;
  const rows = toRows(nodes);
  const gapX = Math.max(0, Math.round(average(rows.flatMap((row) => row.slice(1).map((n, i) => n.x - (row[i]!.x + row[i]!.width))), 20)));
  const gapY = Math.max(0, Math.round(average(rows.slice(1).map((row, i) => Math.min(...row.map((n) => n.y)) - Math.max(...rows[i]!.map((n) => n.y + n.height))), 20)));
  const left = Math.min(...nodes.map((n) => n.x));
  let y = Math.min(...nodes.map((n) => n.y));
  doc.stopCapturing();
  for (const row of rows) {
    let x = left;
    for (const n of row) {
      doc.setPosition(n.id, round2(x), round2(y));
      x += n.width + gapX;
    }
    y += Math.max(...row.map((n) => n.height)) + gapY;
  }
  doc.stopCapturing();
  return nodes.length;
}

/** Figma's "Pack horizontal / vertical": layers are lined up in order, touching, starting where the first one was. */
export function packLayers(doc: DesignDoc, ids: string[], axis: "horizontal" | "vertical"): number {
  const nodes = real(doc, ids);
  if (nodes.length < 2) return 0;
  const sorted = [...nodes].sort((a, b) => (axis === "horizontal" ? a.x - b.x : a.y - b.y));
  let cursor = axis === "horizontal" ? sorted[0]!.x : sorted[0]!.y;
  doc.stopCapturing();
  for (const n of sorted) {
    doc.setPosition(n.id, round2(axis === "horizontal" ? cursor : n.x), round2(axis === "horizontal" ? n.y : cursor));
    cursor += axis === "horizontal" ? n.width : n.height;
  }
  doc.stopCapturing();
  return nodes.length;
}

/** Figma's "Round to pixel": position and size of the selected layers (and what is inside them) snap to whole pixels. */
export function roundToPixel(doc: DesignDoc, ids: string[]): number {
  let changed = 0;
  doc.stopCapturing();
  for (const id of ids) {
    const root = doc.getNode(id);
    if (!root || root.type === "PAGE" || root.type === "DOCUMENT") continue;
    for (const n of [root, ...doc.descendants(id)]) {
      const box = { x: Math.round(n.x), y: Math.round(n.y), width: Math.round(n.width), height: Math.round(n.height) };
      if (box.x === n.x && box.y === n.y && box.width === n.width && box.height === n.height) continue;
      doc.setPosition(n.id, box.x, box.y);
      // resizing a frame would move its children by their constraints; only plain size changes go through resizeNode
      doc.resizeNode(n.id, { width: box.width, height: box.height });
      changed++;
    }
  }
  doc.stopCapturing();
  return changed;
}
