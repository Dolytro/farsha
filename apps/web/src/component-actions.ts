import type { DesignDoc } from "@farsha/design-core";
import { topLevelOf } from "./clipboard";

/** Figma's "Create component" (Ctrl+Alt+K): a frame becomes a main component, anything else is wrapped in one. */
export function createComponentFromSelection(doc: DesignDoc, ids: string[]): string[] {
  const tops = topLevelOf(doc, ids);
  if (!tops.length) return ids;
  doc.stopCapturing();
  const parents = new Set(tops.map((id) => doc.getNode(id)?.parentId));
  // Layers from different parents each become their own component.
  const groups = parents.size === 1 ? [tops] : tops.map((id) => [id]);
  const made = groups.map((g) => doc.createComponent(g));
  doc.stopCapturing();
  return made;
}

/** Figma's "Detach instance" (Ctrl+Alt+B). Returns the detached frames. */
export function detachSelection(doc: DesignDoc, ids: string[]): string[] {
  const roots = [...new Set(ids.map((id) => doc.instanceOf(id)?.id).filter((id): id is string => !!id))];
  if (!roots.length) return ids;
  doc.stopCapturing();
  roots.forEach((id) => doc.detachInstance(id));
  doc.stopCapturing();
  return roots;
}

/** Figma's "Reset all overrides". */
export function resetSelection(doc: DesignDoc, ids: string[]): void {
  const roots = new Set(ids.map((id) => doc.instanceOf(id)?.id).filter((id): id is string => !!id));
  doc.stopCapturing();
  roots.forEach((id) => doc.resetOverrides(id));
  doc.stopCapturing();
}

/** The main components the selected instances point to. */
export function mainsOf(doc: DesignDoc, ids: string[]): string[] {
  return [...new Set(ids.map((id) => doc.instanceOf(id)).map((n) => (n && n.type === "FRAME" ? n.componentId : undefined)).filter((id): id is string => !!id && doc.hasNode(id)))];
}
