import type { DesignDoc } from "@canvylo/design-core";
import { topLevelOf } from "./clipboard";

export type DropWhere = "before" | "after" | "inside";

export interface LayerRow {
  id: string;
  depth: number;
  hasChildren: boolean;
}

const CONTAINERS = new Set(["FRAME", "GROUP"]);

export function isContainer(doc: DesignDoc, id: string): boolean {
  const n = doc.getNode(id);
  return !!n && CONTAINERS.has(n.type);
}

function layerLabel(doc: DesignDoc, id: string): string {
  const n = doc.getNode(id);
  if (!n) return "";
  return n.type === "TEXT" && n.name === "Text" ? n.characters : n.name;
}

/** Rows shown in the layers panel, top of the list first. A search keeps matches and the layers above them. */
export function layerRows(doc: DesignDoc, pageId: string, collapsed: ReadonlySet<string>, query = ""): LayerRow[] {
  const q = query.trim().toLowerCase();
  const keep = new Set<string>();
  if (q) {
    for (const d of doc.descendants(pageId)) {
      if (!layerLabel(doc, d.id).toLowerCase().includes(q)) continue;
      for (let cur: string | null = d.id; cur && cur !== pageId; cur = doc.getNode(cur)?.parentId ?? null) keep.add(cur);
    }
  }
  const out: LayerRow[] = [];
  const walk = (parentId: string, depth: number) => {
    for (const n of [...doc.children(parentId)].reverse()) {
      if (q && !keep.has(n.id)) continue;
      const hasChildren = doc.children(n.id).length > 0;
      out.push({ id: n.id, depth, hasChildren });
      if (hasChildren && (q || !collapsed.has(n.id))) walk(n.id, depth + 1);
    }
  };
  walk(pageId, 0);
  return out;
}

/**
 * Drag layers in the panel. "before" means visually above the target (higher in z-order), like the
 * panel shows them. Layers keep their position on the canvas when they change parent.
 * Returns the ids that moved (empty when the drop is not allowed).
 */
export function moveLayers(doc: DesignDoc, ids: string[], targetId: string, where: DropWhere): string[] {
  const target = doc.getNode(targetId);
  if (!target?.parentId) return [];
  const moving = topLevelOf(doc, ids).filter((id) => id !== targetId && !doc.isAncestor(id, targetId) && doc.getNode(id)?.parentId);
  if (!moving.length) return [];
  const newParent = where === "inside" ? targetId : target.parentId;
  if (where === "inside" && !isContainer(doc, targetId)) return [];

  const absolute = new Map(moving.map((id) => [id, doc.absoluteBox(id)]));
  moving.sort((a, b) => ((doc.getNode(a)?.orderKey ?? "") < (doc.getNode(b)?.orderKey ?? "") ? -1 : 1));
  const rest = doc.children(newParent).filter((n) => !moving.includes(n.id));
  const at = where === "inside" ? rest.length : rest.findIndex((n) => n.id === targetId) + (where === "before" ? 1 : 0);

  const parentNode = doc.getNode(newParent)!;
  const origin = parentNode.type === "PAGE" ? { x: 0, y: 0 } : (doc.absoluteBox(newParent) ?? { x: 0, y: 0 });
  doc.stopCapturing();
  try {
    moving.forEach((id, i) => {
      const oldParent = doc.getNode(id)!.parentId;
      doc.reparentNode(id, newParent, at + i);
      const abs = absolute.get(id);
      if (abs && oldParent !== newParent) doc.setPosition(id, abs.x - origin.x, abs.y - origin.y);
    });
  } finally {
    doc.stopCapturing();
  }
  return moving;
}
