import type { DesignDoc } from "@farsha/design-core";
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

/** The kinds the layers panel can filter by (Figma's "filter by type"). */
export const LAYER_KINDS = [
  { id: "frame", label: "Frames" },
  { id: "section", label: "Sections" },
  { id: "group", label: "Groups" },
  { id: "component", label: "Components" },
  { id: "instance", label: "Instances" },
  { id: "text", label: "Text" },
  { id: "rectangle", label: "Rectangles" },
  { id: "ellipse", label: "Ellipses" },
  { id: "vector", label: "Vectors" },
  { id: "image", label: "Images" },
] as const;

export type LayerKind = (typeof LAYER_KINDS)[number]["id"];
export type LayerKindFilter = LayerKind | "all";

/** Which filter bucket a layer falls in. Main components and instances are listed apart from plain frames. */
export function layerKind(doc: DesignDoc, id: string): LayerKind | undefined {
  const n = doc.getNode(id);
  if (!n) return undefined;
  if (n.type === "FRAME") return n.isComponent ? "component" : n.componentId ? "instance" : n.isSection ? "section" : "frame";
  if (n.type === "GROUP") return "group";
  if (n.type === "TEXT") return "text";
  if (n.type === "RECTANGLE") return "rectangle";
  if (n.type === "ELLIPSE") return "ellipse";
  if (n.type === "VECTOR") return "vector";
  if (n.type === "IMAGE") return "image";
  return undefined;
}

function layerLabel(doc: DesignDoc, id: string): string {
  const n = doc.getNode(id);
  if (!n) return "";
  return n.type === "TEXT" && n.name === "Text" ? n.characters : n.name;
}

/**
 * Rows shown in the layers panel, top of the list first. A search and a type filter keep the layers that match
 * (both must match when both are set) and the layers above them.
 */
export function layerRows(doc: DesignDoc, pageId: string, collapsed: ReadonlySet<string>, query = "", kind: LayerKindFilter = "all"): LayerRow[] {
  const q = query.trim().toLowerCase();
  const filtering = !!q || kind !== "all";
  const keep = new Set<string>();
  if (filtering) {
    for (const d of doc.descendants(pageId)) {
      if (q && !layerLabel(doc, d.id).toLowerCase().includes(q)) continue;
      if (kind !== "all" && layerKind(doc, d.id) !== kind) continue;
      for (let cur: string | null = d.id; cur && cur !== pageId; cur = doc.getNode(cur)?.parentId ?? null) keep.add(cur);
    }
  }
  const out: LayerRow[] = [];
  const walk = (parentId: string, depth: number) => {
    for (const n of [...doc.children(parentId)].reverse()) {
      if (filtering && !keep.has(n.id)) continue;
      const hasChildren = doc.children(n.id).length > 0;
      out.push({ id: n.id, depth, hasChildren });
      if (hasChildren && (filtering || !collapsed.has(n.id))) walk(n.id, depth + 1);
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

export type TreeKey = "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight" | "Home" | "End";

/**
 * What an arrow key does in the layers tree (the keyboard pattern of a tree view): Up and Down move to the neighbour, Home and End to the ends,
 * Right opens a folded layer or goes to its first child, Left folds an open layer or goes to its parent.
 */
export function treeKeyTarget(rows: LayerRow[], currentId: string | undefined, key: TreeKey, collapsed: ReadonlySet<string>): { select?: string; toggle?: { id: string; collapse: boolean } } {
  if (!rows.length) return {};
  const i = rows.findIndex((r) => r.id === currentId);
  if (i < 0) return { select: key === "End" ? rows[rows.length - 1]!.id : rows[0]!.id };
  const row = rows[i]!;
  if (key === "ArrowDown") return i + 1 < rows.length ? { select: rows[i + 1]!.id } : {};
  if (key === "ArrowUp") return i > 0 ? { select: rows[i - 1]!.id } : {};
  if (key === "Home") return { select: rows[0]!.id };
  if (key === "End") return { select: rows[rows.length - 1]!.id };
  if (key === "ArrowRight") {
    if (!row.hasChildren) return {};
    if (collapsed.has(row.id)) return { toggle: { id: row.id, collapse: false } };
    const next = rows[i + 1];
    return next && next.depth > row.depth ? { select: next.id } : {};
  }
  // ArrowLeft
  if (row.hasChildren && !collapsed.has(row.id)) return { toggle: { id: row.id, collapse: true } };
  for (let j = i - 1; j >= 0; j--) if (rows[j]!.depth < row.depth) return { select: rows[j]!.id };
  return {};
}

/**
 * Shift+click in the layers list (Figma): every layer from the one clicked before (the anchor) to this one, in the order they are listed.
 * Without an anchor that is in the list, only the clicked layer is selected.
 */
export function rangeBetween(rows: LayerRow[], anchorId: string | undefined, targetId: string): string[] {
  const to = rows.findIndex((r) => r.id === targetId);
  if (to < 0) return [];
  const from = anchorId ? rows.findIndex((r) => r.id === anchorId) : -1;
  if (from < 0) return [targetId];
  const [a, b] = from <= to ? [from, to] : [to, from];
  return rows.slice(a, b + 1).map((r) => r.id);
}

/** Alt+click on a chevron: open the layer and everything inside it, or close all of it when it was open. */
export function toggleBranch(collapsed: ReadonlySet<string>, id: string, descendantIds: string[]): Set<string> {
  const next = new Set(collapsed);
  const all = [id, ...descendantIds];
  if (collapsed.has(id)) for (const x of all) next.delete(x);
  else for (const x of all) next.add(x);
  return next;
}

/** Selecting a layer on the canvas opens every folded layer above it in the list. Returns `collapsed` itself when nothing needs opening. */
export function revealAncestors(doc: DesignDoc, ids: string[], collapsed: ReadonlySet<string>): ReadonlySet<string> {
  let next: Set<string> | null = null;
  for (const id of ids) {
    let parent = doc.getNode(id)?.parentId;
    while (parent) {
      if (collapsed.has(parent)) (next ??= new Set(collapsed)).delete(parent);
      parent = doc.getNode(parent)?.parentId;
    }
  }
  return next ?? collapsed;
}
