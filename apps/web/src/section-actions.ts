import type { DesignDoc } from "@farsha/design-core";
import type { DesignNode } from "@farsha/types";
import { unionBox } from "@farsha/canvas-engine";

export const isSection = (n: DesignNode | undefined): boolean => n?.type === "FRAME" && !!n.isSection;

/** The frames of a page that count as screens: frames on the page itself, and frames inside sections (sections are only folders on the canvas). */
export function topLevelFrames(doc: DesignDoc, pageId: string): DesignNode[] {
  const out: DesignNode[] = [];
  const walk = (parentId: string) => {
    for (const n of doc.children(parentId)) {
      if (n.type !== "FRAME") continue;
      if (n.isSection) walk(n.id);
      else out.push(n);
    }
  };
  walk(pageId);
  return out;
}

/** Figma's "Wrap in new section" (Ctrl+S): the layers go into a section the size of their bounds. Returns the new selection. */
export function wrapInSection(doc: DesignDoc, ids: string[]): string[] {
  const nodes = ids.map((id) => doc.getNode(id)).filter((n): n is DesignNode => !!n?.parentId);
  const parentId = nodes[0]?.parentId;
  if (!parentId || nodes.some((n) => n.parentId !== parentId)) return ids;
  const pad = 40;
  const box = unionBox(nodes.map((n) => ({ x: n.x, y: n.y, width: n.width, height: n.height })))!;
  const order = doc.children(parentId).map((n) => n.id);
  const sorted = [...nodes].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  const sectionCount = doc.descendants(doc.rootId).filter((n) => n.type === "FRAME" && n.isSection).length;
  doc.stopCapturing();
  const section = doc.createNode("FRAME", {
    parentId,
    index: order.indexOf(sorted[0]!.id),
    props: {
      name: `Section ${sectionCount + 1}`,
      x: box.x - pad,
      y: box.y - pad,
      width: box.width + pad * 2,
      height: box.height + pad * 2,
      clipsContent: false,
      fills: [{ type: "SOLID", color: "#eceef2", opacity: 1 }],
      isSection: true,
    },
  });
  for (const n of sorted) {
    doc.reparentNode(n.id, section);
    doc.setPosition(n.id, n.x - box.x + pad, n.y - box.y + pad);
  }
  doc.stopCapturing();
  return [section];
}

/** Convert frames to sections ("Convert to section") or back ("Convert to frame"). Returns how many layers changed. */
export function setSection(doc: DesignDoc, ids: string[], on: boolean): number {
  let changed = 0;
  doc.stopCapturing();
  for (const id of ids) {
    const n = doc.getNode(id);
    if (n?.type !== "FRAME" || !!n.isSection === on || n.isComponent || n.componentId) continue;
    doc.setStyle(id, { isSection: on, clipsContent: !on } as never);
    changed++;
  }
  doc.stopCapturing();
  return changed;
}
