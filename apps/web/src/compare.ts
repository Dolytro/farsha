import type { DesignDoc } from "@canvylo/design-core";
import type { DesignNode } from "@canvylo/types";

export interface NodeChange {
  id: string;
  name: string;
  /** Property names that differ, such as "fills" or "width". */
  fields: string[];
}

export interface DocChanges {
  added: { id: string; name: string }[];
  removed: { id: string; name: string }[];
  changed: NodeChange[];
}

/** Properties that only describe where a layer sits in the list, not how it looks. */
const IGNORED = new Set(["orderKey"]);

const everyNode = (doc: DesignDoc): DesignNode[] => doc.descendants(doc.rootId);

/**
 * Figma's "Compare changes": what differs between an earlier state of the document and now.
 * Layers are matched by id. `changed` lists the property names that differ; a layer moved to another parent shows "parentId".
 */
export function compareDocs(before: DesignDoc, after: DesignDoc): DocChanges {
  const oldNodes = new Map(everyNode(before).map((n) => [n.id, n]));
  const newNodes = new Map(everyNode(after).map((n) => [n.id, n]));
  const added = [...newNodes.values()].filter((n) => !oldNodes.has(n.id)).map((n) => ({ id: n.id, name: n.name }));
  const removed = [...oldNodes.values()].filter((n) => !newNodes.has(n.id)).map((n) => ({ id: n.id, name: n.name }));
  const changed: NodeChange[] = [];
  for (const [id, now] of newNodes) {
    const was = oldNodes.get(id);
    if (!was) continue;
    const a = was as unknown as Record<string, unknown>;
    const b = now as unknown as Record<string, unknown>;
    const fields = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => !IGNORED.has(k) && JSON.stringify(a[k]) !== JSON.stringify(b[k])).sort();
    if (fields.length) changed.push({ id, name: now.name, fields });
  }
  return { added, removed, changed };
}

export const hasChanges = (c: DocChanges): boolean => c.added.length + c.removed.length + c.changed.length > 0;
