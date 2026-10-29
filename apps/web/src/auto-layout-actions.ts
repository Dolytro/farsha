import type { DesignDoc } from "@canvylo/design-core";
import { unionBox } from "@canvylo/canvas-engine";
import type { Box, DesignNode, LayoutMode } from "@canvylo/types";

const round = (v: number) => Math.round(v * 100) / 100;

/** Row or column? Whichever axis the layers are spread along more. */
function guessDirection(boxes: Box[]): LayoutMode {
  if (boxes.length < 2) return "VERTICAL";
  const spread = (values: number[]) => Math.max(...values) - Math.min(...values);
  const x = spread(boxes.map((b) => b.x + b.width / 2));
  const y = spread(boxes.map((b) => b.y + b.height / 2));
  return x >= y ? "HORIZONTAL" : "VERTICAL";
}

/** Turn auto layout on for a frame, keeping what it looks like: direction, order, gap and padding come from the current positions. */
function applyToFrame(doc: DesignDoc, frame: Extract<DesignNode, { type: "FRAME" }>): void {
  const kids = doc.children(frame.id).filter((c) => c.visible);
  const boxes = kids.map((c) => ({ x: c.x, y: c.y, width: c.width, height: c.height }));
  const mode = guessDirection(boxes);
  const horizontal = mode === "HORIZONTAL";
  const sorted = [...kids].sort((a, b) => (horizontal ? a.x - b.x : a.y - b.y));
  sorted.forEach((c, i) => doc.reorderNode(c.id, i));

  let gap = 10;
  if (sorted.length > 1) {
    const gaps = sorted.slice(1).map((c, i) => {
      const prev = sorted[i]!;
      return horizontal ? c.x - (prev.x + prev.width) : c.y - (prev.y + prev.height);
    });
    gap = Math.max(0, round(gaps.reduce((a, b) => a + b, 0) / gaps.length));
  }
  const union = unionBox(boxes);
  const padLeft = union ? Math.max(0, round(union.x)) : 0;
  const padTop = union ? Math.max(0, round(union.y)) : 0;
  const padRight = union ? Math.max(0, round(frame.width - (union.x + union.width))) : 0;
  const padBottom = union ? Math.max(0, round(frame.height - (union.y + union.height))) : 0;
  doc.setStyle(frame.id, {
    layoutMode: mode,
    itemSpacing: gap,
    paddingLeft: padLeft,
    paddingRight: padRight,
    paddingTop: padTop,
    paddingBottom: padBottom,
    primaryAxisAlign: "MIN",
    counterAxisAlign: "MIN",
    primarySizing: "HUG",
    counterSizing: "HUG",
  });
}

/**
 * Figma's "Add auto layout" (Shift+A). A selected frame gets auto layout; any other layers that share a parent are
 * wrapped in a new auto layout frame. Returns the new selection.
 */
export function addAutoLayout(doc: DesignDoc, ids: string[]): string[] {
  const nodes = ids.map((id) => doc.getNode(id)).filter((n): n is DesignNode => !!n && !!n.parentId);
  if (!nodes.length) return ids;
  doc.stopCapturing();
  try {
    const only = nodes[0]!;
    if (nodes.length === 1 && only.type === "FRAME") {
      applyToFrame(doc, only);
      return [only.id];
    }
    const parentId = only.parentId!;
    if (nodes.some((n) => n.parentId !== parentId)) return ids;
    const box = unionBox(nodes.map((n) => ({ x: n.x, y: n.y, width: n.width, height: n.height })))!;
    const frameId = doc.createNode("FRAME", {
      parentId,
      props: { name: "Frame", x: box.x, y: box.y, width: box.width, height: box.height, fills: [], clipsContent: false },
    });
    for (const n of nodes) {
      doc.reparentNode(n.id, frameId);
      doc.setPosition(n.id, n.x - box.x, n.y - box.y);
    }
    applyToFrame(doc, doc.getNode(frameId) as Extract<DesignNode, { type: "FRAME" }>);
    return [frameId];
  } finally {
    doc.stopCapturing();
  }
}

/** Remove auto layout from the selected frames; children keep the positions the layout gave them. */
export function removeAutoLayout(doc: DesignDoc, ids: string[]): void {
  doc.stopCapturing();
  for (const id of ids) {
    const n = doc.getNode(id);
    if (n?.type === "FRAME" && n.layoutMode) doc.setStyle(id, { layoutMode: null });
  }
  doc.stopCapturing();
}
